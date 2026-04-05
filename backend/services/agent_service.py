import utils.tools as _tools_module
from agents import get_tool_agent_graph
from schemas.schema import AgentState
from langchain_core.messages import HumanMessage, AIMessage
from services.memory_service import format_memory_block

# ─── System instructions for tool agent ──────────
_SYSTEM_PROMPT = """

---
[SYSTEM INSTRUCTIONS]
IMPORTANT:
1. If the user asks about "this document", "last uploaded PDF", "recent file", "the pdf" or similar references to the most recent document:
   - Call knowledge_retriever with mode="last"
   - This will automatically retrieve from the most recently uploaded document
   
2. Otherwise:
   - You decide when to call knowledge_retriever based on your knowledge
   - If you don't know the answer or need factual information: call knowledge_retriever
   - If you can answer confidently from your general knowledge: answer directly
   - Never guess or make up information

When calling knowledge_retriever:
  knowledge_retriever(
      query: "<your search query>",
      mode: "all" | "last"  (optional, default: "all")
  )
---"""


async def run_tool_agent(
    query: str,
    user_id: str = "default_user",
    pdfs: list[str] | None = None,
    memory_context: str | None = None,
) -> dict:
    """
    Run the tool-calling agent and return answer + tool usage info.

    Returns a dict with:
        answer          : str
        tools_used      : list[dict]
        message_count   : int
        retrieved_chunks: list[dict]  ← all chunks buffered during this call,
                                        to be logged by the caller after append_message
                                        returns the real message_id.
    """
    # ── Set per-request context; clear chunk buffer from any previous request ─
    _tools_module.CURRENT_USER_ID = user_id
    _tools_module.RETRIEVED_CHUNKS_BUFFER.clear()

    # ── Build the message content (inject prior history if available) ─────────
    if memory_context:
        print(f"[agent_service] Injecting memory context ({len(memory_context)} chars) into tool agent prompt.")
        message_content = format_memory_block(memory_context) + query + _SYSTEM_PROMPT
    else:
        print("[agent_service] No memory context — running tool agent without history.")
        message_content = query + _SYSTEM_PROMPT

    try:
        graph = get_tool_agent_graph()
        initial_state: AgentState = {"messages": [HumanMessage(content=message_content)]}
        result = graph.invoke(initial_state)
        messages = result["messages"]

        tools_used = []
        final_answer = ""

        for msg in messages:
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                for tc in msg.tool_calls:
                    tools_used.append({"tool": tc["name"], "args": tc["args"]})
            if isinstance(msg, AIMessage) and msg.content and not (hasattr(msg, "tool_calls") and msg.tool_calls):
                final_answer = msg.content

        # Snapshot the buffer — caller uses this after append_message to log with correct message_id
        retrieved_chunks = list(_tools_module.RETRIEVED_CHUNKS_BUFFER)

        return {
            "answer": final_answer,
            "tools_used": tools_used,
            "message_count": len(messages),
            "retrieved_chunks": retrieved_chunks,
        }
    except Exception as e:
        print(f"[agent_service] Error: {e}")
        raise
    finally:
        # Always clean up — prevents chunks from leaking into the next request
        _tools_module.CURRENT_USER_ID = "default_user"
        _tools_module.RETRIEVED_CHUNKS_BUFFER.clear()