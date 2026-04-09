import json
from typing import AsyncGenerator
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


async def run_orchestrator_stream(
    task: str, 
    memory_context: str | None = None
) -> AsyncGenerator[dict, None]:
    """Stream the orchestrator pipeline phase by phase.
    
    Yields events as each node completes:
    - {"type": "plan", "subtasks": [...]} — after orchestrator creates subtasks
    - {"type": "content_chunk", "section": "researcher_1", "content": "..."} — researcher 1 result
    - {"type": "content_chunk", "section": "researcher_2", "content": "..."} — researcher 2 result
    - {"type": "content_chunk", "section": "aggregation", "content": "..."} — aggregator result
    - {"type": "final", "result": "...", "meta": {...}} — final result with critic scores
    """
    try:
        graph = get_orchestrator_graph()

        # Inject prior conversation context into the task
        effective_task = task
        if memory_context:
            print(f"[orchestrator_service:stream] Injecting memory context ({len(memory_context)} chars)")
            effective_task = format_memory_block(memory_context) + task
        else:
            print("[orchestrator_service:stream] No memory context — running orchestrator without history.")

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

        # Use astream to get events as each node completes
        # LangGraph astream yields {node_name: state_update} dicts
        async for event in graph.astream(initial_state, stream_mode="updates"):
            # event is a dict like {"orchestrator": {...}, "parallel_researchers": {...}, etc.}
            for node_name, node_output in event.items():
                if node_name == "orchestrator":
                    # Subtasks created — emit plan event
                    subtasks = node_output.get("subtasks", [])
                    yield {
                        "type": "plan",
                        "subtasks": [
                            {
                                "id": st["id"],
                                "description": st["description"],
                                "agent_type": st["agent_type"],
                            }
                            for st in subtasks
                        ],
                    }
                    # Also emit content_chunk for decomposition
                    subtask_descriptions = "\n".join(
                        f"- **Researcher {st['id']}:** {st['description']}"
                        for st in subtasks
                        if st["agent_type"] == "researcher"
                    )
                    yield {
                        "type": "content_chunk",
                        "section": "decomposition",
                        "content": subtask_descriptions,
                    }

                elif node_name == "parallel_researchers":
                    # Researchers completed — emit each researcher's result
                    subtasks = node_output.get("subtasks", [])
                    researcher_idx = 0
                    for st in subtasks:
                        if st["agent_type"] == "researcher":
                            researcher_idx += 1
                            section_name = f"researcher_{researcher_idx}"
                            yield {
                                "type": "content_chunk",
                                "section": section_name,
                                "content": st.get("result", ""),
                            }

                elif node_name == "aggregator":
                    # Aggregator completed — emit synthesis
                    final_result = node_output.get("final_result", "")
                    yield {
                        "type": "content_chunk",
                        "section": "aggregation",
                        "content": final_result,
                    }

                elif node_name == "critic":
                    # Critic completed — emit final result with meta
                    confidence = node_output.get("critic_confidence", 85)
                    consistency = node_output.get("critic_logical_consistency", 85)
                    feedback = node_output.get("critic_feedback", "")
                    serious_mistakes = node_output.get("serious_mistakes", [])
                    
                    # Get the final_result from the state (aggregator set it)
                    # We need to track state across nodes, so we'll emit what we have
                    yield {
                        "type": "critic_done",
                        "meta": {
                            "confidence_score": confidence,
                            "logical_consistency": consistency,
                            "critic_feedback": feedback,
                            "serious_mistakes": serious_mistakes,
                        },
                    }

    except Exception as e:
        print(f"[orchestrator_service:stream] Error: {e}")
        yield {"type": "error", "message": str(e)}


async def run_orchestrator_stream_with_state(
    task: str, 
    memory_context: str | None = None
) -> AsyncGenerator[dict, None]:
    """Stream the orchestrator pipeline, tracking full state across nodes.
    
    This version accumulates state so we can emit the complete final_result
    when the critic finishes.
    """
    try:
        graph = get_orchestrator_graph()

        # Inject prior conversation context into the task
        effective_task = task
        if memory_context:
            print(f"[orchestrator_service:stream] Injecting memory context ({len(memory_context)} chars)")
            effective_task = format_memory_block(memory_context) + task
        else:
            print("[orchestrator_service:stream] No memory context — running orchestrator without history.")

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

        # Track accumulated state
        accumulated_state = dict(initial_state)

        # Use astream with mode="values" to get full state after each node
        async for event in graph.astream(initial_state, stream_mode="values"):
            # event is the full state after each node update
            subtasks = event.get("subtasks", [])
            final_result = event.get("final_result", "")
            critic_confidence = event.get("critic_confidence", 0)
            critic_logical_consistency = event.get("critic_logical_consistency", 0)
            critic_feedback = event.get("critic_feedback", "")
            serious_mistakes = event.get("serious_mistakes", [])
            step_logs = event.get("step_logs", [])

            # Determine which node just completed by checking step_logs
            last_log = step_logs[-1] if step_logs else ""

            if "Orchestrator" in last_log and ("created" in last_log or "decomposed" in last_log):
                # Subtasks created — emit plan event
                yield {
                    "type": "plan",
                    "subtasks": [
                        {
                            "id": st["id"],
                            "description": st["description"],
                            "agent_type": st["agent_type"],
                        }
                        for st in subtasks
                    ],
                }
                # Also emit content_chunk for decomposition
                subtask_descriptions = "\n".join(
                    f"- **Researcher {st['id']}:** {st['description']}"
                    for st in subtasks
                    if st["agent_type"] == "researcher"
                )
                yield {
                    "type": "content_chunk",
                    "section": "decomposition",
                    "content": subtask_descriptions,
                }

            elif "researchers completed" in last_log:
                # Researchers completed — emit each researcher's result
                researcher_idx = 0
                for st in subtasks:
                    if st["agent_type"] == "researcher":
                        researcher_idx += 1
                        section_name = f"researcher_{researcher_idx}"
                        yield {
                            "type": "content_chunk",
                            "section": section_name,
                            "content": st.get("result", ""),
                        }

            elif "Aggregator agent synthesized" in last_log:
                # Aggregator completed — emit synthesis
                yield {
                    "type": "content_chunk",
                    "section": "aggregation",
                    "content": final_result,
                }

            elif "Critic agent evaluated" in last_log:
                # Critic completed — emit final result with meta
                yield {
                    "type": "final",
                    "result": final_result,
                    "meta": {
                        "confidence_score": critic_confidence,
                        "logical_consistency": critic_logical_consistency,
                        "critic_feedback": critic_feedback,
                        "serious_mistakes": serious_mistakes,
                        "retry_count": 0,
                        "tools_used": [
                            st.get("agent_type", "") + "Agent" for st in subtasks
                        ],
                        "orchestrator_raw": {
                            "subtasks": [
                                {
                                    "id": st["id"],
                                    "description": st["description"],
                                    "agent_type": st["agent_type"],
                                    "result": st.get("result", ""),
                                }
                                for st in subtasks
                            ],
                            "final_result": final_result,
                            "critic_confidence": critic_confidence,
                            "critic_logical_consistency": critic_logical_consistency,
                            "critic_feedback": critic_feedback,
                        },
                    },
                }

    except Exception as e:
        print(f"[orchestrator_service:stream] Error: {e}")
        yield {"type": "error", "message": str(e)}
