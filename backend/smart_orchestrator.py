import json
from typing import AsyncGenerator, Callable
from llm_engine import get_llm
from convo import run_tool_agent
from orchestrator import run_orchestrator
from langchain_core.messages import HumanMessage, SystemMessage
from coding_agent import (
        code_planner_node, parallel_coders_node, code_aggregator_node,
        code_reviewer_node, should_retry, format_output_node, parse_sections,
        NODE_COORDS,
    )


# ─── Query Classifier ─────────────────────────────────────────────────────────

async def classify_query(task: str) -> tuple[str, str, str]:
    """Classify the task into one of three paths and return problem understanding for code tasks."""
    llm = get_llm(temperature=0.0, change=False)

    prompt = f"""You are a query router. Classify the following user query into exactly one category.

Query: {task}

Categories:
- standard: Simple factual questions, greetings, quick calculations, single-step tasks
- deep_research: Questions requiring multi-perspective research, analysis, comparisons, explanations of complex topics
- code: Requests to write, implement, debug, or generate code, algorithms, data structures

Respond in EXACTLY this format:
PATH: [standard|deep_research|code]
UNDERSTANDING: [If PATH is code, provide a brief 2-3 sentence problem understanding explaining what the problem asks for and what the expected solution should look like. If PATH is not code, write "N/A"]
REASON: [brief explanation of why this path was chosen]"""

    response = await llm.ainvoke([
        SystemMessage(content="You are a query classifier. Output only the specified format."),
        HumanMessage(content=prompt),
    ])

    content = response.content.strip()
    path = "standard"  # default
    reason = "Default classification"
    problem_understanding = "N/A"

    for line in content.split("\n"):
        line = line.strip()
        if line.startswith("PATH:"):
            extracted = line.split(":")[1].strip().lower()
            if extracted in ("standard", "deep_research", "code"):
                path = extracted
        elif line.startswith("UNDERSTANDING:"):
            problem_understanding = line.split(":", 1)[1].strip()
        elif line.startswith("REASON:"):
            reason = line.split(":", 1)[1].strip()

    return path, reason, problem_understanding


# ─── Node Coordinates for Standard & Deep Research Paths ──────────────────────

STANDARD_NODE_COORDS = {
    "router": {"x": 400, "y": 60},
    "output": {"x": 400, "y": 200},
}

DEEP_RESEARCH_NODE_COORDS = {
    "router":              {"x": 400, "y": 60},
    "orchestrator":        {"x": 400, "y": 160},
    "researcher_1":        {"x": 240, "y": 280},
    "researcher_2":        {"x": 560, "y": 280},
    "aggregator":          {"x": 400, "y": 400},
    "critic":              {"x": 400, "y": 480},
    "output":              {"x": 400, "y": 560},
}


# ─── Smart Orchestrator SSE Stream ────────────────────────────────────────────

async def smart_orchestrator_stream(task: str) -> AsyncGenerator[str, None]:
    """Main entry point: classifies query and routes to appropriate pipeline with SSE."""
    def yield_event(event: dict) -> str:
        return f"data: {json.dumps(event)}\n\n"

    try:
        # Step 1: Classify the query (returns path, reason, and problem understanding)
        path, reason, problem_understanding = await classify_query(task)
        yield yield_event({"type": "route", "path": path, "reason": reason})

        router = "Smart Router"
        # ─── Standard Path ────────────────────────────────────────────────
        if path == "standard":
            # Emit router node
            yield yield_event({
                "type": "node_update",
                "node_id": "router",
                "status": "completed",
                "label": router,
                "node_type": "orchestrator",
                "x": STANDARD_NODE_COORDS["router"]["x"],
                "y": STANDARD_NODE_COORDS["router"]["y"],
                "output": f"Routed to: standard (Reason: {reason})",
            })

            yield yield_event({"type": "stage", "stage": "agent", "message": "Running tool-calling agent..."})

            # Run the standard tool-calling agent
            result = await run_tool_agent(task)

            # Emit output node
            yield yield_event({
                "type": "node_update",
                "node_id": "output",
                "status": "completed",
                "label": "Tool Agent",
                "node_type": "output",
                "x": STANDARD_NODE_COORDS["output"]["x"],
                "y": STANDARD_NODE_COORDS["output"]["y"],
                "output": result.get("answer", "")[:200],
            })

            # Yield final result
            yield yield_event({
                "type": "final",
                "result": result.get("answer", "No response received."),
                "meta": {
                    "confidence_score": 85,
                    "logical_consistency": 85,
                    "critic_feedback": "",
                    "retry_count": 0,
                    "tools_used": [t.get("tool", "") for t in result.get("tools_used", [])],
                },
            })

        # ─── Deep Research Path ───────────────────────────────────────────
        elif path == "deep_research":
            # Emit router node
            yield yield_event({
                "type": "node_update",
                "node_id": "router",
                "status": "completed",
                "label": router,
                "node_type": "orchestrator",
                "x": DEEP_RESEARCH_NODE_COORDS["router"]["x"],
                "y": DEEP_RESEARCH_NODE_COORDS["router"]["y"],
                "output": f"Routed to: deep_research (Reason: {reason})",
            })

            # Emit orchestrator node running
            yield yield_event({
                "type": "node_update",
                "node_id": "orchestrator",
                "status": "running",
                "label": "Orchestrator",
                "node_type": "orchestrator",
                "x": DEEP_RESEARCH_NODE_COORDS["orchestrator"]["x"],
                "y": DEEP_RESEARCH_NODE_COORDS["orchestrator"]["y"],
                "output": None,
            })

            yield yield_event({"type": "stage", "stage": "planning", "message": "Decomposing task..."})

            # Run the orchestrator
            result = await run_orchestrator(task)

            # Emit orchestrator completed
            yield yield_event({
                "type": "node_update",
                "node_id": "orchestrator",
                "status": "completed",
                "label": "Orchestrator",
                "node_type": "orchestrator",
                "x": DEEP_RESEARCH_NODE_COORDS["orchestrator"]["x"],
                "y": DEEP_RESEARCH_NODE_COORDS["orchestrator"]["y"],
                "output": f"Created {len(result.get('subtasks', []))} subtasks",
            })

            # Emit nodes for researchers, aggregator, critic, output
            subtasks = result.get("subtasks", [])
            researcher_idx = 0
            for st in subtasks:
                if st.get("agent_type") == "researcher":
                    researcher_idx += 1
                    node_id = f"researcher_{researcher_idx}"
                    coords = DEEP_RESEARCH_NODE_COORDS.get(node_id, {"x": 400, "y": 280})
                    yield yield_event({
                        "type": "node_update",
                        "node_id": node_id,
                        "status": "completed",
                        "label": f"Researcher {researcher_idx}",
                        "node_type": "agent",
                        "x": coords["x"],
                        "y": coords["y"],
                        "output": (st.get("result", "") or "")[:200],
                    })

            # Aggregator
            yield yield_event({
                "type": "node_update",
                "node_id": "aggregator",
                "status": "completed",
                "label": "Aggregator",
                "node_type": "agent",
                "x": DEEP_RESEARCH_NODE_COORDS["aggregator"]["x"],
                "y": DEEP_RESEARCH_NODE_COORDS["aggregator"]["y"],
                "output": "Synthesized final report",
            })

            # Critic
            yield yield_event({
                "type": "node_update",
                "node_id": "critic",
                "status": "completed",
                "label": "Critic",
                "node_type": "critic",
                "x": DEEP_RESEARCH_NODE_COORDS["critic"]["x"],
                "y": DEEP_RESEARCH_NODE_COORDS["critic"]["y"],
                "output": f"Confidence: {result.get('critic_confidence', 85)}% | Consistency: {result.get('critic_logical_consistency', 85)}%",
            })

            # Output
            yield yield_event({
                "type": "node_update",
                "node_id": "output",
                "status": "completed",
                "label": "Final Report",
                "node_type": "output",
                "x": DEEP_RESEARCH_NODE_COORDS["output"]["x"],
                "y": DEEP_RESEARCH_NODE_COORDS["output"]["y"],
                "output": "7-section structured output",
            })

            # Final result
            yield yield_event({
                "type": "final",
                "result": result.get("final_result", ""),
                "meta": {
                    "confidence_score": result.get("critic_confidence", 85),
                    "logical_consistency": result.get("critic_logical_consistency", 85),
                    "critic_feedback": result.get("critic_feedback", ""),
                    "retry_count": 0,
                    "tools_used": [st.get("agent_type", "") + "Agent" for st in subtasks],
                    "orchestrator_raw": result,
                },
            })

        # ─── Code Path ───────────────────────────────────────────────────
        elif path == "code":
            # Emit router node
            yield yield_event({
                "type": "node_update",
                "node_id": "router",
                "status": "completed",
                "label": "Smart Router",
                "node_type": "orchestrator",
                "x": 400,
                "y": 60,
                "output": f"Routed to: code (Reason: {reason})",
            })

            # Use problem understanding from classify_query (no extra LLM call needed)
            yield yield_event({"type": "code_section", "section": "problem_understanding", "content": problem_understanding})

            yield yield_event({"type": "stage", "stage": "coding", "message": "Starting code generation pipeline..."})

            # Run coding agent - iterate over its async generator and yield each event
            async for event_str in run_coding_agent_sse(task, yield_event):
                yield event_str

    except Exception as e:
        yield yield_event({"type": "error", "message": str(e)})


async def run_coding_agent_sse(task: str, yield_event: Callable) -> None:
    """Run coding agent with SSE yielding."""
    
    from schemas.schema import CodingAgentState

    state: CodingAgentState = {
        "original_task": task,
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

    # 1. Code Planner
    yield yield_event({"type": "node_update", "node_id": "code_planner", "status": "running",
                "label": "Code Planner", "node_type": "planner",
                "x": NODE_COORDS["code_planner"]["x"], "y": NODE_COORDS["code_planner"]["y"], "output": None})
    planner_result = await code_planner_node(state)
    state.update(planner_result)
    yield yield_event({"type": "node_update", "node_id": "code_planner", "status": "completed",
                "label": "Code Planner", "node_type": "planner",
                "x": NODE_COORDS["code_planner"]["x"], "y": NODE_COORDS["code_planner"]["y"],
                "output": f"Created {len(state['subtasks'])} subtasks"})

    yield yield_event({"type": "plan", "subtasks": [
        {"id": st["id"], "description": st["description"], "signatures": st.get("signatures", [])}
        for st in state["subtasks"]
    ]})

    # 2. Parallel Coders
    for i in range(3):
        coder_id = f"coder_{i+1}"
        yield yield_event({"type": "node_update", "node_id": coder_id, "status": "running",
                    "label": f"Coding Agent {i+1}", "node_type": "coder",
                    "x": NODE_COORDS[coder_id]["x"], "y": NODE_COORDS[coder_id]["y"], "output": None})

    coder_result = await parallel_coders_node(state)
    state.update(coder_result)

    for i in range(3):
        coder_id = f"coder_{i+1}"
        output_preview = state["coder_results"][i][:200] + "..." if len(state["coder_results"][i]) > 200 else state["coder_results"][i]
        yield yield_event({"type": "node_update", "node_id": coder_id, "status": "completed",
                    "label": f"Coding Agent {i+1}", "node_type": "coder",
                    "x": NODE_COORDS[coder_id]["x"], "y": NODE_COORDS[coder_id]["y"],
                    "output": output_preview})

    # 3. Aggregator-Reviewer Loop
    while True:
        yield yield_event({"type": "node_update", "node_id": "code_aggregator", "status": "running",
                    "label": "Code Aggregator", "node_type": "aggregator",
                    "x": NODE_COORDS["code_aggregator"]["x"], "y": NODE_COORDS["code_aggregator"]["y"], "output": None})
        aggregator_result = await code_aggregator_node(state)
        state.update(aggregator_result)
        yield yield_event({"type": "node_update", "node_id": "code_aggregator", "status": "completed",
                    "label": "Code Aggregator", "node_type": "aggregator",
                    "x": NODE_COORDS["code_aggregator"]["x"], "y": NODE_COORDS["code_aggregator"]["y"],
                    "output": f"Merged {len(state['coder_results'])} coder outputs"})

        yield yield_event({"type": "node_update", "node_id": "code_reviewer", "status": "running",
                    "label": "Code Reviewer", "node_type": "reviewer",
                    "x": NODE_COORDS["code_reviewer"]["x"], "y": NODE_COORDS["code_reviewer"]["y"], "output": None})
        reviewer_result = await code_reviewer_node(state)
        state.update(reviewer_result)
        yield yield_event({"type": "node_update", "node_id": "code_reviewer", "status": "completed",
                    "label": "Code Reviewer", "node_type": "reviewer",
                    "x": NODE_COORDS["code_reviewer"]["x"], "y": NODE_COORDS["code_reviewer"]["y"],
                    "output": f"Confidence: {state['confidence_score']}% | Errors: {len(state['review_errors'])}"})

        if should_retry(state) == "format_output":
            break

    # 4. Format Output
    yield yield_event({"type": "node_update", "node_id": "output", "status": "running",
                "label": "Final Output", "node_type": "output",
                "x": NODE_COORDS["output"]["x"], "y": NODE_COORDS["output"]["y"], "output": None})
    format_result = await format_output_node(state)
    state.update(format_result)
    yield yield_event({"type": "node_update", "node_id": "output", "status": "completed",
                "label": "Final Output", "node_type": "output",
                "x": NODE_COORDS["output"]["x"], "y": NODE_COORDS["output"]["y"],
                "output": "Code generation complete"})

    # Stream sections progressively
    for section, content in parse_sections(state["final_output"]):
        yield yield_event({"type": "code_section", "section": section, "content": content})

    # Final result
    yield yield_event({"type": "final", "result": state["final_output"], "meta": {
        "confidence_score": state["confidence_score"],
        "logical_consistency": state["logical_consistency"],
        "critic_feedback": state["critic_feedback"],
        "retry_count": state["retry_count"],
        "tools_used": [],
    }})