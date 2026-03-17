import asyncio
from llm_engine import get_llm
from langgraph.graph import StateGraph, END
from schemas.schema import OrchestratorState
from langchain_core.messages import HumanMessage, SystemMessage

# ─── Parallel Orchestrator (2 Researchers + Aggregator) ─────────────────────────────

def orchestrator_node_parallel(state: OrchestratorState):
    """Creates exactly 2 researcher subtasks and 1 writer subtask."""
    task = state["original_task"]
    subtasks = [
        {
            "id": 1,
            "description": f"Comprehensive research on: {task}. Gather facts, data, background information, and existing analysis from reliable sources.",
            "agent_type": "researcher",
            "result": None,
        },
        {
            "id": 2,
            "description": f"Alternative perspectives and debates on: {task}. Identify conflicting viewpoints, controversies, gaps in knowledge, and complementary information.",
            "agent_type": "researcher",
            "result": None,
        },
        {
            "id": 3,
            "description": "Synthesize findings into a comprehensive final report with the required 7-section structure.",
            "agent_type": "aggregator",
            "result": None,
        },
    ]
    logs = state.get("step_logs", [])
    logs.append(f"🎯 Orchestrator created {len(subtasks)} subtasks (2x researcher + aggregator)")
    return {"subtasks": subtasks, "step_logs": logs}


async def parallel_researchers_node(state: OrchestratorState):
    """Executes all researcher subtasks in parallel and updates their results."""
    
    subtasks = state["subtasks"]
    researcher_indices = [i for i, st in enumerate(subtasks) if st["agent_type"] == "researcher"]
    logs = list(state.get("step_logs", []))
    logs.append(f"🚀 Launching {len(researcher_indices)} researcher agents in parallel")

    original_task = state["original_task"]

    async def run_researcher(description: str) -> str:
        llm = get_llm(temperature=0.3)
        prompt = f"""Original task: {original_task}
                Your research assignment: {description}

                Conduct thorough research and provide detailed findings. Include facts, data, sources, and any relevant context. Be comprehensive and precise."""
        
        response = await llm.ainvoke([
            SystemMessage(content="You are a research agent. Your job is to thoroughly research the given topic and provide comprehensive, unique, and factual information."),
            HumanMessage(content=prompt),
        ])
        return response.content

    tasks = [run_researcher(subtasks[i]["description"]) for i in researcher_indices]
    results = await asyncio.gather(*tasks)

    new_subtasks = list(subtasks)
    for idx, result in zip(researcher_indices, results):
        st = dict(new_subtasks[idx])
        st["result"] = result
        new_subtasks[idx] = st

    logs.append(f"✅ All {len(researcher_indices)} researchers completed")
    return {"subtasks": new_subtasks, "step_logs": logs}


async def aggregator_node(state: OrchestratorState):
    """Takes aggregator subtask and both researcher results, produces the final 7-section report."""
    subtasks = state["subtasks"]
    aggregator_subtask = next((st for st in subtasks if st["agent_type"] == "aggregator"), None)
    logs = list(state.get("step_logs", []))

    if not aggregator_subtask:
        logs.append("❌ No aggregator subtask found")
        return {"final_result": "Error: Aggregator agent missing.", "step_logs": logs}

    researcher_results = [st["result"] for st in subtasks if st["agent_type"] == "researcher"]
    researcher_texts = "\n\n".join(
        f"--- Researcher {i+1} ---\n{res}" for i, res in enumerate(researcher_results)
    )

    llm = get_llm(temperature=0.2, change=True)
    prompt = f"""You are a professional research writer. Synthesize the following research findings into a comprehensive, structured final report.

        Original Task: {state['original_task']}

        Research Inputs:
        {researcher_texts}

        Write a detailed report using EXACTLY these sections (use proper markdown headings):

        1. Executive Summary
        Provide a concise overview of the topic and main conclusions.

        2. Key Findings
        List the most important discoveries in bullet points.

        3. Evidence From Sources
        Present detailed evidence, data, and source citations.

        4. Trends / Analysis
        Analyze trends, patterns, implications, and provide insights.

        5. Contradictions or Debates
        Highlight any conflicting information, controversies, or areas of disagreement.

        6. Conclusion
        Summarize the key points and provide a forward-looking perspective.

        7. Sources / Citations
        List all sources referenced in the research. If none were provided, note that.

        Use clear markdown formatting with ## for major sections and ### for subsections where appropriate. Be comprehensive but avoid redundancy."""
    
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    logs.append("✍️ Aggregator agent synthesized final report with 7-section structure")

    new_subtasks = list(subtasks)
    for i, st in enumerate(new_subtasks):
        if st["agent_type"] == "aggregator":
            new_subtasks[i] = dict(st)
            new_subtasks[i]["result"] = response.content
            break

    return {"final_result": response.content, "subtasks": new_subtasks, "step_logs": logs}


def _build_orchestrator_graph_parallel():
    graph = StateGraph(OrchestratorState)
    graph.add_node("orchestrator", orchestrator_node_parallel)
    graph.add_node("parallel_researchers", parallel_researchers_node)
    graph.add_node("aggregator", aggregator_node)

    graph.set_entry_point("orchestrator")
    graph.add_edge("orchestrator", "parallel_researchers")
    graph.add_edge("parallel_researchers", "aggregator")
    graph.add_edge("aggregator", END)

    return graph.compile()

_graph_parallel = _build_orchestrator_graph_parallel()


async def run_orchestrator(task: str) -> dict:
    try:
        initial_state = {
            "original_task": task,
            "subtasks": [],
            "current_subtask_index": 0,
            "final_result": "",
            "step_logs": [],
        }
        result = await _graph_parallel.ainvoke(initial_state)

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
        raise
