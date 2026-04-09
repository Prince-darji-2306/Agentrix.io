import logging
from typing import AsyncGenerator
from core.llm_engine import get_llm
from utils.tools import get_tools_list, get_tools_map
from schemas.schema import AgentState
from langchain_core.messages import HumanMessage, ToolMessage, AIMessage
from langgraph.graph import StateGraph, END

logger = logging.getLogger(__name__)


def agent_node(state: AgentState):
    """LLM agent node: binds tools and invokes the model."""
    llm = get_llm().bind_tools(get_tools_list())
    response = llm.invoke(state["messages"])
    return {"messages": [response]}


def tool_node(state: AgentState):
    """Execute tool calls from the last agent message."""
    last_msg = state["messages"][-1]
    tool_messages = []
    for tc in last_msg.tool_calls:
        tool_fn = get_tools_map().get(tc["name"])
        if tool_fn:
            try:
                result = tool_fn.invoke(tc["args"])
                tool_messages.append(
                    ToolMessage(content=str(result), tool_call_id=tc["id"])
                )
            except Exception as e:
                logger.error(f"[tool_node] Error invoking {tc['name']}: {e}")
                tool_messages.append(
                    ToolMessage(content=f"Tool execution failed: {str(e)}", tool_call_id=tc["id"])
                )
        else:
            tool_messages.append(
                ToolMessage(content="Tool not found.", tool_call_id=tc["id"])
            )
    return {"messages": tool_messages}


def should_continue(state: AgentState):
    """Route to tools if the agent made tool calls, otherwise end."""
    last_msg = state["messages"][-1]
    if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
        return "tools"
    return END


# ─── Build Graph ──────────────────────────────────────────────────────────────


def _build_graph():
    graph = StateGraph(AgentState)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", tool_node)
    graph.set_entry_point("agent")
    graph.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
    graph.add_edge("tools", "agent")
    return graph.compile()


_graph = _build_graph()


def get_tool_agent_graph():
    """Return the compiled LangGraph tool-calling agent graph."""
    return _graph


# ─── Streaming Execution (3-Phase Async Generator) ───────────────────────────


async def run_tool_agent_stream(
    messages: list,
) -> AsyncGenerator[dict, None]:
    """
    Execute the tool-calling agent with real-time streaming (3-phase).

    Yields event dicts:
        {"type": "token", "content": "...", "phase": "initial"|"final"}
        {"type": "tool_start", "tool_name": "...", "tool_args": {...}}
        {"type": "tool_end", "tool_name": "...", "tool_output": "..."}
        {"type": "complete", "answer": "...", "tools_used": [...], "messages": [...]}

    3-Phase flow:
      Phase 1: Stream the initial LLM response (text tokens or tool call decision)
      Phase 2: Execute any tool calls locally
      Phase 3: Stream the final LLM summary after tool results
    """
    llm = get_llm().bind_tools(get_tools_list())

    # ── Phase 1: Stream the initial response ──────────────────────────────
    logger.info("[convo_agent] Phase 1: Streaming initial LLM response...")
    first_response = None

    for chunk in llm.stream(messages):
        if first_response is None:
            first_response = chunk
        else:
            first_response += chunk

        if chunk.content:
            yield {"type": "token", "content": chunk.content, "phase": "initial"}

    messages.append(first_response)
    has_tool_calls = bool(first_response.tool_calls)
    logger.info(f"[convo_agent] Phase 1 complete. Tool calls: {has_tool_calls}")

    # ── Phase 2: Execute tools if needed ──────────────────────────────────
    tools_used = []
    if has_tool_calls:
        logger.info(
            f"[convo_agent] Phase 2: Executing {len(first_response.tool_calls)} tool call(s)..."
        )
        for tc in first_response.tool_calls:
            tool_name = tc["name"]
            tool_args = tc["args"]
            logger.info(
                f"[convo_agent]   Executing tool: {tool_name} with args: {tool_args}"
            )

            yield {
                "type": "tool_start",
                "tool_name": tool_name,
                "tool_args": tool_args,
            }

            tool_fn = get_tools_map().get(tool_name)
            if tool_fn:
                try:
                    tool_output = tool_fn.invoke(tool_args)
                    logger.info(
                        f"[convo_agent]   Tool {tool_name} returned: {str(tool_output)[:200]}..."
                    )
                    messages.append(
                        ToolMessage(content=str(tool_output), tool_call_id=tc["id"])
                    )
                    tools_used.append({"tool": tool_name, "args": tool_args})

                    yield {
                        "type": "tool_end",
                        "tool_name": tool_name,
                        "tool_output": str(tool_output),
                    }
                except Exception as e:
                    logger.error(f"[convo_agent] Tool {tool_name} execution error: {e}")
                    error_msg = f"Tool execution failed: {str(e)}"
                    messages.append(
                        ToolMessage(content=error_msg, tool_call_id=tc["id"])
                    )
                    yield {
                        "type": "tool_end",
                        "tool_name": tool_name,
                        "tool_output": error_msg,
                    }
            else:
                error_msg = f"Tool not found: {tool_name}"
                logger.warning(f"[convo_agent]   {error_msg}")
                messages.append(ToolMessage(content=error_msg, tool_call_id=tc["id"]))

    # ── Phase 3: Final stream (summary after tool results) ────────────────
    initial_answer = first_response.content if first_response.content else ""
    final_answer = ""
    if has_tool_calls:
        logger.info("[convo_agent] Phase 3: Streaming final LLM summary...")
        for chunk in llm.stream(messages):
            if chunk.content:
                final_answer += chunk.content
                yield {"type": "token", "content": chunk.content, "phase": "final"}
        logger.info(
            f"[convo_agent] Phase 3 complete. Final answer length: {len(final_answer)}"
        )
    else:
        final_answer = initial_answer
        logger.info(
            f"[convo_agent] No tool calls needed. Answer length: {len(final_answer)}"
        )

    # Combine initial + final answer for complete response
    complete_answer = initial_answer + final_answer if has_tool_calls else final_answer
    
    yield {
        "type": "complete",
        "answer": complete_answer,
        "tools_used": tools_used,
        "messages": messages,
    }
