from llm_engine import get_llm
from utils.tools import get_tools_map
from langgraph.graph import StateGraph, END
from schemas.schema import AgentState
from utils.tools import get_tools_list
from langchain_core.messages import HumanMessage, ToolMessage, AIMessage

def agent_node(state: AgentState):
    llm = get_llm().bind_tools(get_tools_list())
    response = llm.invoke(state["messages"])
    return {"messages": [response]}

def tool_node(state: AgentState):
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

async def run_tool_agent(query: str) -> dict:
    try:
        initial_state = {"messages": [HumanMessage(content=query)]}
        result = _graph.invoke(initial_state)
        messages = result["messages"]
        
        # Build response with tool usage info
        tools_used = []
        final_answer = ""
        
        for msg in messages:
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                for tc in msg.tool_calls:
                    tools_used.append({"tool": tc["name"], "args": tc["args"]})
            if isinstance(msg, AIMessage) and msg.content and not (hasattr(msg, "tool_calls") and msg.tool_calls):
                final_answer = msg.content
        
        return {
            "answer": final_answer,
            "tools_used": tools_used,
            "message_count": len(messages),
        }
    except Exception as e:
        print(e)
