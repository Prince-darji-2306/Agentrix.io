import json
from llm_engine import get_llm
from langgraph.graph import StateGraph, END
from schemas.schema import OrchestratorState
from langchain_core.messages import HumanMessage, SystemMessage

# ─── Orchestrator Node ────────────────────────────────────────────────────────
def orchestrator_node(state: OrchestratorState):
    task = state["original_task"]
    llm = get_llm()
    
    prompt = f"""You are an orchestrator AI. Break the following task into 2-4 concrete subtasks.
        Each subtask should be handled by a specialized agent type.

        Available agent types:
        - "researcher": Researches facts, gathers information
        - "analyst": Analyzes data, identifies patterns, evaluates options
        - "writer": Writes, summarizes, formats content
        - "critic": Reviews, finds flaws, suggests improvements

        Original Task: {task}

        Respond ONLY with STRICT JSON array like:
        [
        {{"id": 1, "description": "...", "agent_type": "researcher"}},
        {{"id": 2, "description": "...", "agent_type": "analyst"}},
        ...
        ]"""
    
    response = llm.invoke([HumanMessage(content=prompt)])
    
    content = response.content.strip()
    
    start = content.find("[")
    end = content.rfind("]") + 1
    if start != -1 and end > start:
        json_str = content[start:end]
        subtasks = json.loads(json_str)
        for s in subtasks:
            s["result"] = None
    else:
        subtasks = [{"id": 1, "description": task, "agent_type": "researcher", "result": None}]
    
    logs = state.get("step_logs", [])
    logs.append(f"🎯 Orchestrator created {len(subtasks)} subtasks")
    
    return {
        "subtasks": subtasks,
        "current_subtask_index": 0,
        "step_logs": logs,
    }

# ─── Worker Agent Node ────────────────────────────────────────────────────────
AGENT_PERSONAS = {
    "researcher": "You are a research agent. Your job is to thoroughly research the given topic and provide comprehensive,unique and factual information.",
    "analyst": "You are an analytical agent. Your job is to analyze information, identify patterns, evaluate options, and provide data-driven insights.",
    "writer": "You are a writing agent. Your job is to write clear, engaging, and well-structured content.",
    "critic": "You are a critical review agent. Your job is to evaluate work, identify weaknesses, and suggest concrete improvements.",
}

def worker_node(state: OrchestratorState):
    idx = state["current_subtask_index"]
    subtasks = list(state["subtasks"])  # copy
    
    if idx >= len(subtasks):
        return state
    
    subtask = subtasks[idx]
    agent_type = subtask.get("agent_type")
    persona = AGENT_PERSONAS.get(agent_type)
    
    llm = get_llm(temperature=0.3)
    
    # Include context from previous results
    context = ""
    for i, prev in enumerate(subtasks[:idx]):
        if prev.get("result"):
            context += f"\nPrevious subtask {i+1} ({prev['agent_type']}): {prev['result']}\n"
    
    prompt = f"""Original task: {state['original_task']}
        {f'Context from previous agents:{context}' if context else ''}
        Your subtask: {subtask['description']}
        Complete your subtask thoroughly"""
    
    response = llm.invoke([
        SystemMessage(content=persona),
        HumanMessage(content=prompt),
    ])
    
    subtasks[idx]["result"] = response.content
    
    logs = state.get("step_logs", [])
    logs.append(f"✅ {agent_type.capitalize()} Agent completed subtask {idx + 1}: {subtask['description'][:60]}...")
    
    return {
        "subtasks": subtasks,
        "current_subtask_index": idx + 1,
        "step_logs": logs,
    }

# ─── Aggregator Node ──────────────────────────────────────────────────────────
def aggregator_node(state: OrchestratorState):
    llm = get_llm(temperature=0.2, change=True)
    
    results_text = ""
    for st in state["subtasks"]:
        results_text += f"\n### {st['agent_type'].upper()} Agent (Task: {st['description']})\n{st.get('result', 'No result')}\n"
    
    prompt = f"""You are an aggregator. Synthesize the following agent outputs into one coherent, comprehensive final answer.

        Original Task: {state['original_task']}

        Agent Outputs:
        {results_text}

        Write a well-structured final answer that combines all insights. Be comprehensive but concise."""
    
    response = llm.invoke([HumanMessage(content=prompt)])
    
    logs = state.get("step_logs", [])
    logs.append("🔗 Aggregator synthesized all results into final answer")
    
    return {
        "final_result": response.content,
        "step_logs": logs,
    }

# ─── Router ───────────────────────────────────────────────────────────────────
def should_continue_working(state: OrchestratorState):
    idx = state.get("current_subtask_index", 0)
    total = len(state.get("subtasks", []))
    if idx < total:
        return "worker"
    return "aggregator"

# ─── Build Graph ──────────────────────────────────────────────────────────────
def _build_graph():
    graph = StateGraph(OrchestratorState)
    graph.add_node("orchestrator", orchestrator_node)
    graph.add_node("worker", worker_node)
    graph.add_node("aggregator", aggregator_node)
    
    graph.set_entry_point("orchestrator")
    graph.add_edge("orchestrator", "worker")
    graph.add_conditional_edges(
        "worker",
        should_continue_working,
        {"worker": "worker", "aggregator": "aggregator"},
    )
    graph.add_edge("aggregator", END)
    return graph.compile()

_graph = _build_graph()

async def run_orchestrator(task: str) -> dict:
    try:
        initial_state = {
            "original_task": task,
            "subtasks": [],
            "current_subtask_index": 0,
            "final_result": "",
            "step_logs": [],
        }
        result = _graph.invoke(initial_state)
        
        return {
            "final_result": result["final_result"],
            "subtasks": [
                {
                    "id": st["id"],
                    "description": st["description"],
                    "agent_type": st["agent_type"],
                    "result": st.get("result", ""),
                }
                for st in result["subtasks"]
            ],
            "step_logs": result.get("step_logs", []),
        }
    
    except Exception as e:
        print(e)
