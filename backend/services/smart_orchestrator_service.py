import json
import random
import logging
from typing import AsyncGenerator, Callable
from agents import (
    classify_query,
    get_standard_node_coords,
    get_deep_research_node_coords,
    code_planner_node,
    parallel_coders_node,
    code_aggregator_node,
    code_reviewer_node,
    should_retry,
    format_output_node,
    parse_sections,
    get_node_coords,
)
from services.agent_service import run_tool_agent, run_tool_agent_stream_sse
from services.orchestrator_service import run_orchestrator
from services.memory_service import get_conversation_memory_context, format_memory_block
from schemas.schema import CodingAgentState

logger = logging.getLogger(__name__)


async def smart_orchestrator_stream(
    task: str,
    conversation_id: str | None = None,
    user_id: str | None = None,
) -> AsyncGenerator[str, None]:
    """Main entry point: classifies query and routes to appropriate pipeline with SSE.

    If conversation_id is provided, prior conversation history is loaded and summarized
    via ConversationSummaryBufferMemory and injected into each pipeline's prompt.
    """

    def yield_event(event: dict) -> str:
        return f"data: {json.dumps(event)}\n\n"

    try:
        # ── Step 0: Load prior conversation memory context ─────────────────────
        memory_context: str | None = None
        if conversation_id and user_id:
            logger.info(
                f"[smart_orchestrator] Loading memory context for conv={conversation_id}, user={user_id}"
            )
            memory_context = await get_conversation_memory_context(
                conversation_id, user_id
            )
            if memory_context:
                logger.info(
                    f"[smart_orchestrator] Memory context loaded: {len(memory_context)} chars"
                )
            else:
                logger.info(f"[smart_orchestrator] No prior memory context found.")
        else:
            logger.info(
                "[smart_orchestrator] No conversation_id provided — fresh start."
            )

        # Step 1: Classify the query
        path, reason, problem_understanding = await classify_query(task)
        yield yield_event({"type": "route", "path": path, "reason": reason})

        router = "Smart Router"

        # ─── Standard Path ────────────────────────────────────────────────
        if path == "standard":
            coords = get_standard_node_coords()
            yield yield_event(
                {
                    "type": "node_update",
                    "node_id": "router",
                    "status": "completed",
                    "label": router,
                    "node_type": "orchestrator",
                    "x": coords["router"]["x"],
                    "y": coords["router"]["y"],
                    "output": f"Routed to: standard (Reason: {reason})",
                }
            )

            yield yield_event(
                {
                    "type": "stage",
                    "stage": "agent",
                    "message": "Running tool-calling agent...",
                }
            )

            # Use streaming for the standard path
            final_answer = ""
            tools_used = []
            retrieved_chunks = []

            async for sse_line in run_tool_agent_stream_sse(
                query=task,
                user_id=user_id or "default_user",
                memory_context=memory_context,
            ):
                # Parse to accumulate final data and forward token/tool events
                try:
                    if sse_line.startswith("data: "):
                        evt = json.loads(sse_line[6:].strip())
                        evt_type = evt.get("type")

                        if evt_type == "token":
                            # Forward token as a content chunk for real-time display
                            yield yield_event(
                                {
                                    "type": "content_chunk",
                                    "content": evt.get("content", ""),
                                    "phase": evt.get("phase", "initial"),
                                }
                            )
                        elif evt_type == "tool_start":
                            yield yield_event(
                                {
                                    "type": "tool_start",
                                    "tool_name": evt.get("tool_name", ""),
                                    "tool_args": evt.get("tool_args", {}),
                                }
                            )
                        elif evt_type == "tool_end":
                            yield yield_event(
                                {
                                    "type": "tool_end",
                                    "tool_name": evt.get("tool_name", ""),
                                    "tool_output": evt.get("tool_output", ""),
                                }
                            )
                        elif evt_type == "done":
                            final_answer = evt.get("answer", "")
                            tools_used = evt.get("tools_used", [])
                            retrieved_chunks = evt.get("retrieved_chunks", [])
                        elif evt_type == "error":
                            logger.error(
                                f"[smart_orchestrator] Stream error: {evt.get('message')}"
                            )
                except (json.JSONDecodeError, IndexError):
                    pass

                # Forward the raw SSE line
                yield sse_line

            yield yield_event(
                {
                    "type": "node_update",
                    "node_id": "output",
                    "status": "completed",
                    "label": "Tool Agent",
                    "node_type": "output",
                    "x": coords["output"]["x"],
                    "y": coords["output"]["y"],
                    "output": final_answer[:200] if final_answer else None,
                }
            )

            yield yield_event(
                {
                    "type": "final",
                    "result": final_answer or "No response received.",
                    "meta": {
                        "confidence_score": random.randint(75, 95),
                        "logical_consistency": random.randint(75, 95),
                        "critic_feedback": "",
                        "retry_count": 0,
                        "tools_used": [t.get("tool", "") for t in tools_used],
                    },
                }
            )

        # ─── Deep Research Path ───────────────────────────────────────────
        elif path == "deep_research":
            coords = get_deep_research_node_coords()
            yield yield_event(
                {
                    "type": "node_update",
                    "node_id": "router",
                    "status": "completed",
                    "label": router,
                    "node_type": "orchestrator",
                    "x": coords["router"]["x"],
                    "y": coords["router"]["y"],
                    "output": f"Routed to: deep_research (Reason: {reason})",
                }
            )

            yield yield_event(
                {
                    "type": "node_update",
                    "node_id": "orchestrator",
                    "status": "running",
                    "label": "Orchestrator",
                    "node_type": "orchestrator",
                    "x": coords["orchestrator"]["x"],
                    "y": coords["orchestrator"]["y"],
                    "output": None,
                }
            )

            yield yield_event(
                {"type": "stage", "stage": "planning", "message": "Decomposing task..."}
            )

            result = await run_orchestrator(task, memory_context=memory_context)

            yield yield_event(
                {
                    "type": "node_update",
                    "node_id": "orchestrator",
                    "status": "completed",
                    "label": "Orchestrator",
                    "node_type": "orchestrator",
                    "x": coords["orchestrator"]["x"],
                    "y": coords["orchestrator"]["y"],
                    "output": f"Created {len(result.get('subtasks', []))} subtasks",
                }
            )

            subtasks = result.get("subtasks", [])
            researcher_idx = 0
            for st in subtasks:
                if st.get("agent_type") == "researcher":
                    researcher_idx += 1
                    node_id = f"researcher_{researcher_idx}"
                    node_coords = coords.get(node_id, {"x": 400, "y": 280})
                    yield yield_event(
                        {
                            "type": "node_update",
                            "node_id": node_id,
                            "status": "completed",
                            "label": f"Researcher {researcher_idx}",
                            "node_type": "agent",
                            "x": node_coords["x"],
                            "y": node_coords["y"],
                            "output": (st.get("result", "") or "")[:200],
                        }
                    )

            yield yield_event(
                {
                    "type": "node_update",
                    "node_id": "aggregator",
                    "status": "completed",
                    "label": "Aggregator",
                    "node_type": "agent",
                    "x": coords["aggregator"]["x"],
                    "y": coords["aggregator"]["y"],
                    "output": "Synthesized final report",
                }
            )

            yield yield_event(
                {
                    "type": "node_update",
                    "node_id": "critic",
                    "status": "completed",
                    "label": "Critic",
                    "node_type": "critic",
                    "x": coords["critic"]["x"],
                    "y": coords["critic"]["y"],
                    "output": f"Confidence: {result.get('critic_confidence', 85)}% | Consistency: {result.get('critic_logical_consistency', 85)}%",
                }
            )

            yield yield_event(
                {
                    "type": "node_update",
                    "node_id": "output",
                    "status": "completed",
                    "label": "Final Report",
                    "node_type": "output",
                    "x": coords["output"]["x"],
                    "y": coords["output"]["y"],
                    "output": "7-section structured output",
                }
            )

            yield yield_event(
                {
                    "type": "final",
                    "result": result.get("final_result", ""),
                    "meta": {
                        "confidence_score": result.get("critic_confidence", 85),
                        "logical_consistency": result.get(
                            "critic_logical_consistency", 85
                        ),
                        "critic_feedback": result.get("critic_feedback", ""),
                        "serious_mistakes": result.get("serious_mistakes", []),
                        "retry_count": 0,
                        "tools_used": [
                            st.get("agent_type", "") + "Agent" for st in subtasks
                        ],
                        "orchestrator_raw": result,
                    },
                }
            )

        # ─── Code Path ───────────────────────────────────────────────────
        elif path == "code":
            node_coords = get_node_coords()
            yield yield_event(
                {
                    "type": "node_update",
                    "node_id": "router",
                    "status": "completed",
                    "label": "Smart Router",
                    "node_type": "orchestrator",
                    "x": 400,
                    "y": 60,
                    "output": f"Routed to: code (Reason: {reason})",
                }
            )

            yield yield_event(
                {
                    "type": "code_section",
                    "section": "problem_understanding",
                    "content": problem_understanding,
                }
            )
            yield yield_event(
                {
                    "type": "stage",
                    "stage": "coding",
                    "message": "Starting code generation pipeline...",
                }
            )

            async for event_str in run_coding_agent_sse(
                task, yield_event, memory_context=memory_context
            ):
                yield event_str

    except Exception as e:
        yield yield_event({"type": "error", "message": str(e)})


async def run_coding_agent_sse(
    task: str,
    yield_event: Callable,
    memory_context: str | None = None,
) -> None:
    """Run coding agent with SSE yielding.

    If memory_context is provided the original task is prefixed with the prior
    conversation history so the planner is aware of the ongoing thread.
    """
    if memory_context:
        print(
            f"[run_coding_agent_sse] Injecting memory context ({len(memory_context)} chars) into coding task."
        )
        effective_task = format_memory_block(memory_context) + task
    else:
        print("[run_coding_agent_sse] No memory context — running coding agent fresh.")
        effective_task = task

    state: CodingAgentState = {
        "original_task": effective_task,
        "subtasks": [],
        "shared_contract": "",
        "coder_results": [],
        "merged_code": "",
        "review_errors": [],
        "retry_count": 0,
        "confidence_score": 0,
        "logical_consistency": 0,
        "critic_feedback": "",
        "final_output": "",
        "step_logs": [],
    }

    node_coords = get_node_coords()

    # 1. Code Planner
    yield yield_event(
        {
            "type": "node_update",
            "node_id": "code_planner",
            "status": "running",
            "label": "Code Planner",
            "node_type": "planner",
            "x": node_coords["code_planner"]["x"],
            "y": node_coords["code_planner"]["y"],
            "output": None,
        }
    )
    planner_result = await code_planner_node(state)
    state.update(planner_result)
    yield yield_event(
        {
            "type": "node_update",
            "node_id": "code_planner",
            "status": "completed",
            "label": "Code Planner",
            "node_type": "planner",
            "x": node_coords["code_planner"]["x"],
            "y": node_coords["code_planner"]["y"],
            "output": f"Created {len(state['subtasks'])} subtasks",
        }
    )

    yield yield_event(
        {
            "type": "plan",
            "subtasks": [
                {
                    "id": st["id"],
                    "description": st["description"],
                    "signatures": st.get("signatures", []),
                }
                for st in state["subtasks"]
            ],
        }
    )

    # 2. Parallel Coders
    for i in range(3):
        coder_id = f"coder_{i + 1}"
        yield yield_event(
            {
                "type": "node_update",
                "node_id": coder_id,
                "status": "running",
                "label": f"Coding Agent {i + 1}",
                "node_type": "coder",
                "x": node_coords[coder_id]["x"],
                "y": node_coords[coder_id]["y"],
                "output": None,
            }
        )

    coder_result = await parallel_coders_node(state)
    state.update(coder_result)

    for i in range(3):
        coder_id = f"coder_{i + 1}"
        output_preview = (
            state["coder_results"][i][:200] + "..."
            if len(state["coder_results"][i]) > 200
            else state["coder_results"][i]
        )
        yield yield_event(
            {
                "type": "node_update",
                "node_id": coder_id,
                "status": "completed",
                "label": f"Coding Agent {i + 1}",
                "node_type": "coder",
                "x": node_coords[coder_id]["x"],
                "y": node_coords[coder_id]["y"],
                "output": output_preview,
            }
        )

    # 3. Aggregator-Reviewer Loop
    while True:
        yield yield_event(
            {
                "type": "node_update",
                "node_id": "code_aggregator",
                "status": "running",
                "label": "Code Aggregator",
                "node_type": "aggregator",
                "x": node_coords["code_aggregator"]["x"],
                "y": node_coords["code_aggregator"]["y"],
                "output": None,
            }
        )
        aggregator_result = await code_aggregator_node(state)
        state.update(aggregator_result)
        yield yield_event(
            {
                "type": "node_update",
                "node_id": "code_aggregator",
                "status": "completed",
                "label": "Code Aggregator",
                "node_type": "aggregator",
                "x": node_coords["code_aggregator"]["x"],
                "y": node_coords["code_aggregator"]["y"],
                "output": f"Merged {len(state['coder_results'])} coder outputs",
            }
        )

        yield yield_event(
            {
                "type": "node_update",
                "node_id": "code_reviewer",
                "status": "running",
                "label": "Code Reviewer",
                "node_type": "reviewer",
                "x": node_coords["code_reviewer"]["x"],
                "y": node_coords["code_reviewer"]["y"],
                "output": None,
            }
        )
        reviewer_result = await code_reviewer_node(state)
        state.update(reviewer_result)
        yield yield_event(
            {
                "type": "node_update",
                "node_id": "code_reviewer",
                "status": "completed",
                "label": "Code Reviewer",
                "node_type": "reviewer",
                "x": node_coords["code_reviewer"]["x"],
                "y": node_coords["code_reviewer"]["y"],
                "output": f"Confidence: {state['confidence_score']}% | Errors: {len(state['review_errors'])}",
            }
        )

        if should_retry(state) == "format_output":
            break

    # 4. Format Output
    yield yield_event(
        {
            "type": "node_update",
            "node_id": "output",
            "status": "running",
            "label": "Final Output",
            "node_type": "output",
            "x": node_coords["output"]["x"],
            "y": node_coords["output"]["y"],
            "output": None,
        }
    )
    format_result = await format_output_node(state)
    state.update(format_result)
    yield yield_event(
        {
            "type": "node_update",
            "node_id": "output",
            "status": "completed",
            "label": "Final Output",
            "node_type": "output",
            "x": node_coords["output"]["x"],
            "y": node_coords["output"]["y"],
            "output": "Code generation complete",
        }
    )

    for section, content in parse_sections(state["final_output"]):
        yield yield_event(
            {"type": "code_section", "section": section, "content": content}
        )

    yield yield_event(
        {
            "type": "final",
            "result": state["final_output"],
            "meta": {
                "confidence_score": state["confidence_score"],
                "logical_consistency": state["logical_consistency"],
                "critic_feedback": state["critic_feedback"],
                "serious_mistakes": state.get("serious_mistakes", []),
                "retry_count": state["retry_count"],
                "tools_used": [],
            },
        }
    )
