import json
import logging
from typing import AsyncGenerator
import utils.tools as _tools_module
from agents import get_tool_agent_graph, run_tool_agent_stream
from schemas.schema import AgentState
from langchain_core.messages import HumanMessage, AIMessage
from services.memory_service import format_memory_block

logger = logging.getLogger(__name__)

# ─── System instructions for tool agent ──────────
_SYSTEM_PROMPT = """
You have access to the following tools:
- knowledge_retriever: Use this tool to answer questions about uploaded PDF documents. Call it when user asks about document content.
- calculator: Use for mathematical calculations.
- get_current_datetime: Use when user asks about current time or date.

Instructions:
- Only call tools when necessary
- If you know the answer, respond directly without calling tools
- Do not guess or make up information
- When calling knowledge_retriever, include relevant search query
"""


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
        logger.info(
            f"[agent_service] Injecting memory context ({len(memory_context)} chars) into tool agent prompt."
        )
        message_content = format_memory_block(memory_context) + query + _SYSTEM_PROMPT
    else:
        logger.info(
            "[agent_service] No memory context — running tool agent without history."
        )
        message_content = query + _SYSTEM_PROMPT

    try:
        graph = get_tool_agent_graph()
        initial_state: AgentState = {
            "messages": [HumanMessage(content=message_content)]
        }
        result = graph.invoke(initial_state)
        messages = result["messages"]

        tools_used = []
        final_answer = ""

        for msg in messages:
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                for tc in msg.tool_calls:
                    tools_used.append({"tool": tc["name"], "args": tc["args"]})
            if (
                isinstance(msg, AIMessage)
                and msg.content
                and not (hasattr(msg, "tool_calls") and msg.tool_calls)
            ):
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
        logger.error(f"[agent_service] Error: {e}", exc_info=True)
        raise
    finally:
        # Always clean up — prevents chunks from leaking into the next request
        _tools_module.CURRENT_USER_ID = "default_user"
        _tools_module.RETRIEVED_CHUNKS_BUFFER.clear()


async def run_tool_agent_stream_sse(
    query: str,
    user_id: str = "default_user",
    pdfs: list[str] | None = None,
    memory_context: str | None = None,
) -> AsyncGenerator[str, None]:
    """
    Run the tool-calling agent with SSE streaming (3-phase: initial → tools → final).

    Tokens are batched (~50ms windows) to reduce SSE event overhead
    and produce smooth, low-latency streaming on the frontend.

    Yields SSE-formatted event strings:
        data: {"type": "token", "content": "...", "phase": "initial"|"final"}
        data: {"type": "tool_start", "tool_name": "...", "tool_args": {...}}
        data: {"type": "tool_end", "tool_name": "...", "tool_output": "..."}
        data: {"type": "done", "answer": "...", "tools_used": [...], "retrieved_chunks": [...]}
    """
    # ── Set per-request context; clear chunk buffer ─
    _tools_module.CURRENT_USER_ID = user_id
    _tools_module.RETRIEVED_CHUNKS_BUFFER.clear()

    # ── Build message content ─
    if memory_context:
        logger.info(
            f"[agent_service:stream] Injecting memory context ({len(memory_context)} chars)"
        )
        message_content = format_memory_block(memory_context) + query + _SYSTEM_PROMPT
    else:
        logger.info("[agent_service:stream] No memory context — fresh run")
        message_content = query + _SYSTEM_PROMPT

    messages = [HumanMessage(content=message_content)]
    final_answer = ""
    tools_used = []
    retrieved_chunks = []

    def _sse(event: dict) -> str:
        return f"data: {json.dumps(event)}\n\n"

    # Token batching: accumulate tokens and flush periodically
    token_buffer: dict[str, str] = {"initial": "", "final": ""}
    last_flush = 0.0
    FLUSH_INTERVAL = 0.025  # 25ms — smooth without overwhelming the network

    import time

    async def _flush_tokens(force: bool = False):
        nonlocal last_flush
        now = time.monotonic()
        if not force and (now - last_flush) < FLUSH_INTERVAL:
            return
        for phase in ("initial", "final"):
            if token_buffer[phase]:
                yield _sse(
                    {
                        "type": "token",
                        "content": token_buffer[phase],
                        "phase": phase,
                    }
                )
                token_buffer[phase] = ""
        last_flush = now

    try:
        logger.info("[agent_service:stream] Starting 3-phase streaming execution...")

        async for event in run_tool_agent_stream(messages):
            evt_type = event.get("type")

            if evt_type == "token":
                # Accumulate into phase buffer instead of yielding immediately
                phase = event.get("phase", "initial")
                token_buffer[phase] += event["content"]
                # Flush if buffer is getting large (>300 chars)
                if len(token_buffer[phase]) > 300:
                    async for sse_line in _flush_tokens(force=True):
                        yield sse_line

            elif evt_type == "tool_start":
                # Flush any pending tokens before tool execution
                async for sse_line in _flush_tokens(force=True):
                    yield sse_line
                logger.info(
                    f"[agent_service:stream] Tool starting: {event['tool_name']}"
                )
                yield _sse(
                    {
                        "type": "tool_start",
                        "tool_name": event["tool_name"],
                        "tool_args": event["tool_args"],
                    }
                )

            elif evt_type == "tool_end":
                logger.info(
                    f"[agent_service:stream] Tool completed: {event['tool_name']}"
                )
                yield _sse(
                    {
                        "type": "tool_end",
                        "tool_name": event["tool_name"],
                        "tool_output": event["tool_output"],
                    }
                )

            elif evt_type == "complete":
                # Flush remaining tokens
                async for sse_line in _flush_tokens(force=True):
                    yield sse_line
                final_answer = event["answer"]
                tools_used = event["tools_used"]
                retrieved_chunks = list(_tools_module.RETRIEVED_CHUNKS_BUFFER)

                logger.info(
                    f"[agent_service:stream] Complete. Answer: {len(final_answer)} chars, "
                    f"Tools: {len(tools_used)}, Chunks: {len(retrieved_chunks)}"
                )

                yield _sse(
                    {
                        "type": "done",
                        "answer": final_answer,
                        "tools_used": tools_used,
                        "retrieved_chunks": retrieved_chunks,
                    }
                )

    except Exception as e:
        logger.error(f"[agent_service:stream] Error: {e}", exc_info=True)
        yield _sse({"type": "error", "message": str(e)})
        raise
    finally:
        _tools_module.CURRENT_USER_ID = "default_user"
        _tools_module.RETRIEVED_CHUNKS_BUFFER.clear()
