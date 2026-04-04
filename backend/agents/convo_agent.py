from core.llm_engine import get_llm
from utils.tools import get_tools_list, get_tools_map
from schemas.schema import AgentState
from langchain_core.messages import HumanMessage, ToolMessage, AIMessage
from langgraph.graph import StateGraph, END


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
            result = tool_fn.invoke(tc["args"])
            tool_messages.append(ToolMessage(content=str(result), tool_call_id=tc["id"]))
        else:
            tool_messages.append(ToolMessage(content="Tool not found.", tool_call_id=tc["id"]))
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