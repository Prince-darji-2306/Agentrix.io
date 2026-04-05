from agents import get_orchestrator_graph
from schemas.schema import OrchestratorState
from services.memory_service import format_memory_block


async def run_orchestrator(task: str, memory_context: str | None = None) -> dict:
    """Run the orchestrator pipeline: planner → parallel researchers → aggregator → critic.
    
    If memory_context is provided (prior conversation history), it is prepended to the
    task so the orchestrator planner has awareness of the ongoing thread.
    """
    try:
        graph = get_orchestrator_graph()

        # Inject prior conversation context into the task
        effective_task = task
        if memory_context:
            print(f"[orchestrator_service] Injecting memory context ({len(memory_context)} chars) into orchestrator task.")
            effective_task = format_memory_block(memory_context) + task
        else:
            print("[orchestrator_service] No memory context — running orchestrator without history.")

        initial_state: OrchestratorState = {
            "original_task": effective_task,
            "subtasks": [],
            "current_subtask_index": 0,
            "final_result": "",
            "step_logs": [],
            "critic_confidence": 0,
            "critic_logical_consistency": 0,
            "critic_feedback": "",
            "serious_mistakes": [],
        }
        result = await graph.ainvoke(initial_state)

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
            "critic_confidence": result.get("critic_confidence", 85),
            "critic_logical_consistency": result.get("critic_logical_consistency", 85),
            "critic_feedback": result.get("critic_feedback", ""),
            "serious_mistakes": result.get("serious_mistakes", []),
        }
    except Exception as e:
        print(f"[orchestrator_service] Error: {e}")
        raise