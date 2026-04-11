import asyncio
import json
from typing import Any
from core.llm_engine import get_llm
from schemas.schema import OrchestratorState
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END

_SCORE_MIN = 0
_SCORE_MAX = 100
_VALID_SEVERITIES = {"low", "medium", "high", "critical"}


def _sanitize_fenced_json(raw_text: str) -> str:
    text = raw_text.strip()
    if not text:
        return text

    if text.startswith("```"):
        lines = text.splitlines()
        if lines:
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    if text.lower().startswith("json\n"):
        text = text[5:].strip()

    return text


def _extract_first_json_object(text: str) -> str:
    start = -1
    depth = 0
    in_string = False
    escape_next = False

    for idx, char in enumerate(text):
        if in_string:
            if escape_next:
                escape_next = False
            elif char == "\\":
                escape_next = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
            continue

        if char == "{":
            if depth == 0:
                start = idx
            depth += 1
            continue

        if char == "}" and depth > 0:
            depth -= 1
            if depth == 0 and start != -1:
                return text[start : idx + 1]

    return ""


def _load_json_object(raw_text: str) -> dict[str, Any]:
    sanitized = _sanitize_fenced_json(raw_text)
    candidates = [sanitized]

    extracted = _extract_first_json_object(sanitized)
    if extracted and extracted not in candidates:
        candidates.append(extracted)

    last_error: Exception | None = None
    for candidate in candidates:
        if not candidate:
            continue
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError as exc:
            last_error = exc
            continue
        if not isinstance(parsed, dict):
            raise ValueError("Critic response JSON root must be an object.")
        return parsed

    raise ValueError(f"Unable to parse critic JSON response: {last_error}")


def _clamp_score(value: Any, default: int) -> int:
    try:
        numeric = int(round(float(value)))
    except (TypeError, ValueError):
        numeric = default
    return max(_SCORE_MIN, min(_SCORE_MAX, numeric))


def _normalize_text(value: Any) -> str:
    if value is None:
        return ""
    return value.strip() if isinstance(value, str) else str(value).strip()


def _normalize_serious_mistakes(value: Any) -> list[dict]:
    if not isinstance(value, list):
        return []

    normalized: list[dict] = []
    for item in value:
        if isinstance(item, str):
            description = item.strip()
            if description:
                normalized.append({"severity": "high", "description": description})
            continue
        if not isinstance(item, dict):
            continue

        description = _normalize_text(item.get("description"))
        if not description:
            continue

        severity = _normalize_text(item.get("severity")).lower() or "high"
        if severity not in _VALID_SEVERITIES:
            severity = "high"

        normalized_item = {"severity": severity, "description": description}

        action = _normalize_text(item.get("action"))
        if action:
            normalized_item["action"] = action

        impact = _normalize_text(item.get("impact"))
        if impact:
            normalized_item["impact"] = impact

        normalized.append(normalized_item)

    return normalized


# ─── Parallel Orchestrator (2 Researchers + Aggregator) ──────────────────────

def deep_research_node(state: OrchestratorState):
    """Analyzes the task and creates 2 researcher subtasks with different perspectives + 1 aggregator."""
    task = state["original_task"]
    llm = get_llm(temperature=0.3)

    prompt = f"""You are a task decomposer. Your job is to analyze the given task and break it into exactly 2 research assignments with different perspectives, plus 1 aggregation task.

IMPORTANT RULES:
- The context provided is ONLY for your background understanding. Do NOT include it in your output.
- Each researcher gets a DIFFERENT angle/perspective on the task.
- Researcher 1 should focus on facts, data, core concepts, and established knowledge.
- Researcher 2 should focus on alternative viewpoints, debates, controversies, and edge cases.
- Keep descriptions concise but specific to each researcher's angle.
- Output ONLY valid JSON.

Task: {task}

Respond in EXACTLY this JSON format (no markdown, no backticks):
{{
  "researcher_1": "Specific research assignment for Researcher 1 focusing on core facts and data",
  "researcher_2": "Specific research assignment for Researcher 2 focusing on alternative perspectives and debates"
}}"""

    response = llm.invoke([
        SystemMessage(content="You are a task decomposer. Output only valid JSON."),
        HumanMessage(content=prompt),
    ])

    try:
        content = response.content.strip()
        if content.startswith("```json"):
            content = content.replace("```json", "", 1)
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        parsed = json.loads(content)
        r1_desc = parsed.get("researcher_1", f"Comprehensive research on: {task}")
        r2_desc = parsed.get("researcher_2", f"Alternative perspectives on: {task}")
    except Exception:
        r1_desc = f"Comprehensive research on: {task}. Gather facts, data, background information, and existing analysis from reliable sources."
        r2_desc = f"Alternative perspectives and debates on: {task}. Identify conflicting viewpoints, controversies, gaps in knowledge, and complementary information."

    subtasks = [
        {
            "id": 1,
            "description": r1_desc,
            "agent_type": "researcher",
            "result": None,
        },
        {
            "id": 2,
            "description": r2_desc,
            "agent_type": "researcher",
            "result": None,
        },
        {
            "id": 3,
            "description": "Synthesize findings from both researchers into a comprehensive final report with the required 7-section structure.",
            "agent_type": "aggregator",
            "result": None,
        },
    ]
    logs = state.get("step_logs", [])
    logs.append(f"🎯 Deep Research decomposed task into {len(subtasks)} subtasks (2x researcher + aggregator)")
    return {"subtasks": subtasks, "step_logs": logs}


async def parallel_researchers_node(state: OrchestratorState):
    """Executes all researcher subtasks in parallel and updates their results."""
    subtasks = state["subtasks"]
    researcher_indices = [i for i, st in enumerate(subtasks) if st["agent_type"] == "researcher"]
    logs = list(state.get("step_logs", []))
    logs.append(f"🚀 Launching {len(researcher_indices)} researcher agents in parallel")

    original_task = state["original_task"]

    async def run_researcher(description: str) -> str:
        llm = get_llm(temperature=0.7)
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

            Write a Bery High detailed report using EXACTLY these sections (use proper markdown headings):

            1. Executive Summary
            Provide a Detailed overview of the topic and main conclusions.

            2. Key Findings
            List the most important discoveries in bullet points. Also write the relatted things for the discoveries too.

            3. Evidence From Sources
            Present detailed evidence, data, and source citations.

            4. Trends / Analysis
            Analyze trends, patterns, implications, and provide insights. This Insight should be simple and Very Detailed.

            5. Contradictions or Debates
            Highlight any conflicting information, controversies, or areas of disagreement.

            6. Conclusion
            Summarize the key points and provide a forward-looking perspective.

            7. Sources / Citations
            List Major sources referenced in the research. If none were provided, note that.

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


async def critic_node(state: OrchestratorState):
    """Evaluates the aggregator's final output, assigns confidence and logical consistency scores."""
    logs = list(state.get("step_logs", []))
    final_result = state["final_result"]

    llm = get_llm(temperature=0.0, change=True)
    prompt = f"""You are a strict research quality critic.

            Evaluate the report against the task and produce one JSON object only.

            SCORING RUBRIC (integer 0-100):
            - confidence: How trustworthy and well-supported the report is.
              0-39 = major factual/support gaps; 40-69 = partial support with notable gaps;
              70-89 = mostly supported and reliable; 90-100 = strongly supported, precise, and robust.
            - consistency: Internal logic and alignment with the requested task/structure.
              0-39 = contradictory or off-task; 40-69 = mixed coherence; 70-89 = coherent with minor issues;
              90-100 = fully coherent, complete, and on-task.

            SERIOUS MISTAKE CRITERIA:
            Include only high-impact problems (fabricated claims, major missing sections, direct contradictions,
            unsafe or misleading guidance, or conclusions unsupported by evidence).
            Every serious mistake must describe the issue and a concrete corrective action.

            Report:
            {final_result}

            Task:
            {state['original_task']}

            Output contract (STRICT JSON ONLY; no markdown/backticks/preamble):
            {{
            "confidence": 0,
            "consistency": 0,
            "friendly_feedback": "2-4 sentence actionable summary with at least one concrete next step.",
            "serious_mistakes": [
                {{
                "severity": "high|critical",
                "description": "What is wrong and where it appears.",
                "action": "Specific fix the writer should apply."
                }}
            ]
            }}
            If none, return "serious_mistakes": [] exactly."""

    response = await llm.ainvoke([
        SystemMessage(content="You are a Self-Reflective Critic agent. Output raw JSON only."),
        HumanMessage(content=prompt)
    ])
    logs.append("🔬 Critic agent evaluated output quality")

    parse_error = ""
    parsed: dict[str, Any] = {}
    try:
        parsed = _load_json_object(response.content if isinstance(response.content, str) else str(response.content))
    except ValueError as exc:
        parse_error = str(exc)
        logs.append(f"⚠️ Critic parsing error: {parse_error}")

    confidence_default = 30 if parse_error else 70
    consistency_default = 30 if parse_error else 70
    confidence = _clamp_score(parsed.get("confidence"), default=confidence_default)
    consistency = _clamp_score(
        parsed.get("consistency", parsed.get("logical_consistency", parsed.get("consistency_score"))),
        default=consistency_default,
    )
    feedback = _normalize_text(parsed.get("friendly_feedback", parsed.get("critic_feedback")))
    if not feedback:
        feedback = (
            "Critic output failed strict JSON validation. Re-run evaluation with strict format compliance."
            if parse_error
            else "Review complete. Address highlighted weaknesses to improve confidence and consistency."
        )
    serious_mistakes = _normalize_serious_mistakes(parsed.get("serious_mistakes", []))
    if parse_error and not serious_mistakes:
        serious_mistakes = [
            {
                "severity": "high",
                "description": "Critic output was not valid JSON, so quality scoring may be unreliable.",
                "action": "Re-run critic with strict JSON-only output and reassess the report.",
            }
        ]

    return {
        "critic_confidence": confidence,
        "critic_logical_consistency": consistency,
        "critic_feedback": feedback,
        "serious_mistakes": serious_mistakes,
        "step_logs": logs,
    }


# ─── Build Graph ──────────────────────────────────────────────────────────────

def _build_deep_research_graph():
    graph = StateGraph(OrchestratorState)
    graph.add_node("deep_research", deep_research_node)
    graph.add_node("parallel_researchers", parallel_researchers_node)
    graph.add_node("aggregator", aggregator_node)
    graph.add_node("critic", critic_node)

    graph.set_entry_point("deep_research")
    graph.add_edge("deep_research", "parallel_researchers")
    graph.add_edge("parallel_researchers", "aggregator")
    graph.add_edge("aggregator", "critic")
    graph.add_edge("critic", END)

    return graph.compile()


_deep_research_graph = _build_deep_research_graph()


def get_deep_research_graph():
    """Return the compiled deep_research graph."""
    return _deep_research_graph
