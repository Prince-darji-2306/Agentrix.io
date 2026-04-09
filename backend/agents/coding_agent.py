import json
import asyncio
import re
from typing import Callable
from core.llm_engine import get_llm
from schemas.schema import CodingAgentState, CodingSubtask
from langchain_core.messages import HumanMessage, SystemMessage


# ─── Node Coordinates (for frontend graph) ────────────────────────────────────

NODE_COORDS = {
    "router":          {"x": 400, "y": 60},
    "code_planner":    {"x": 400, "y": 160},
    "coder_1":         {"x": 180, "y": 280},
    "coder_2":         {"x": 400, "y": 280},
    "coder_3":         {"x": 620, "y": 280},
    "code_aggregator": {"x": 400, "y": 400},
    "code_reviewer":   {"x": 400, "y": 480},
    "output":          {"x": 400, "y": 560},
}


def get_node_coords() -> dict:
    """Return the node coordinate map for frontend graph rendering."""
    return NODE_COORDS


# ─── Code Planner Node ───────────────────────────────────────────────────────

async def code_planner_node(state: CodingAgentState) -> dict:
    """Decomposes the task into coding subtasks with shared interface."""
    llm = get_llm(temperature=0.1, instant= True)
    task = state["original_task"]

    prompt = f"""You are a senior software architect. Given the following coding task, break it into multiple independent subtasks that can be implemented in parallel.

            Task: {task}

            INSTRUCTIONS:
            - Analyze what the task requires (could be any language: Python, HTML/CSS/JS, Java, etc.)
            - Break it into Multiple logical, independent subtasks
            - Each subtask should have a clear description of what it implements
            - Include file names if the task naturally produces multiple files.
            - The shared_contract should describe the overall structure/interfaces that all agents must respect

            Respond in EXACTLY this JSON format (no other text):
            {{
            "subtasks": [
                {{
                "id": 1,
                "description": "Clear description of what this subtask implements",
                "signatures": ["Describe the key elements/functions this subtask should produce"]
                }},
                {{
                "id": 2,
                "description": "Clear description of what this subtask implements",
                "signatures": ["Describe the key elements/functions this subtask should produce"]
                }},
                {{
                "id": 3,
                "description": "Clear description of what this subtask implements",
                "signatures": ["Describe the key elements/functions this subtask should produce"]
                }}
            ],
            "shared_contract": "Overall structure and interfaces that all agents must respect"
            }}

            Each subtask should be independently implementable. The shared_contract must describe the overall structure so each coder knows how their work fits with others."""

    response = await llm.ainvoke([
        SystemMessage(content="You are a software architect. Output only valid JSON."),
        HumanMessage(content=prompt),
    ])

    try:
        content = response.content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        parsed = json.loads(content)
        subtasks = parsed.get("subtasks", [])
        shared_contract = parsed.get("shared_contract", "")
    except Exception:
        subtasks = [
            {"id": 1, "description": f"Implement core data structures for: {task}", "signatures": ["Core structures and data types"]},
            {"id": 2, "description": f"Implement main algorithm/logic for: {task}", "signatures": ["Main logic and algorithms"]},
            {"id": 3, "description": f"Implement helper functions and utilities for: {task}", "signatures": ["Helper functions and utilities"]},
        ]
        shared_contract = "All agents should implement their assigned parts with clear interfaces."

    while len(subtasks) < 3:
        subtasks.append({"id": len(subtasks) + 1, "description": f"Additional implementation for: {task}", "signatures": []})

    coding_subtasks: list[CodingSubtask] = []
    for st in subtasks[:3]:
        coding_subtasks.append({
            "id": st.get("id", len(coding_subtasks) + 1),
            "description": st.get("description", ""),
            "signatures": st.get("signatures", []),
            "result": None,
        })

    return {
        "subtasks": coding_subtasks,
        "shared_contract": shared_contract,
    }


# ─── Parallel Coders Node ────────────────────────────────────────────────────

async def parallel_coders_node(state: CodingAgentState) -> dict:
    """Runs 3 coding agents in parallel, each implementing its subtask."""
    subtasks = state["subtasks"]
    shared_contract = state["shared_contract"]
    original_task = state["original_task"]

    async def run_coder(subtask: CodingSubtask, coder_idx: int) -> str:
        llm = get_llm(temperature=0.2, change=False)
        signatures_text = "\n".join(subtask.get("signatures", []))

        prompt = f"""You are Coding Agent {coder_idx + 1}. You are part of a team implementing: {original_task}

        YOUR SPECIFIC TASK:
        {subtask['description']}

        YOUR KEY ELEMENTS TO IMPLEMENT:
        {signatures_text}

        SHARED CONTRACT (overall structure all agents must respect):
        {shared_contract}

        IMPORTANT RULES:
        1. Only implement the parts assigned to you
        2. Follow the shared contract for naming, structure, and interfaces
        3. Do NOT implement parts assigned to other agents — just reference them if needed
        4. Write clean, well-documented code in whatever language best fits the task
        5. Include comments explaining complex logic
        6. After your code os written, provide a Detailed explanation separated by "---"

        OUTPUT FORMAT:
        Write your code first, then after a line with "---", write a brief explanation of what your code does and how it works.

        Write your implementation:"""

        response = await llm.ainvoke([
            SystemMessage(content="You are a coding agent. Write clean, well-documented code in whatever language best fits the task. After your code, provide a brief explanation."),
            HumanMessage(content=prompt),
        ])
        return response.content

    tasks = [run_coder(subtasks[i], i) for i in range(min(3, len(subtasks)))]
    results = await asyncio.gather(*tasks)

    cleaned_results = []
    for result in results:
        cleaned = re.sub(r'```\w*\n', '', result)
        cleaned = cleaned.replace('```', '').strip()
        cleaned_results.append(cleaned)
    results = cleaned_results

    while len(results) < 3:
        results.append("# No implementation provided")

    return {"coder_results": list(results)}


# ─── Code Aggregator Node ─────────────────────────────────────────────────────

async def code_aggregator_node(state: CodingAgentState) -> dict:
    """Merges 3 coder outputs into one coherent codebase."""
    llm = get_llm(temperature=0.1, change=True)
    coder_results = state["coder_results"]
    shared_contract = state["shared_contract"]
    original_task = state["original_task"]
    review_errors = state.get("review_errors", [])

    coder_sections = "\n\n".join(
        f"--- Coder {i+1} Output ---\n{result}" for i, result in enumerate(coder_results)
    )

    error_section = ""
    if review_errors:
        error_section = f"""
                CRITICAL: The previous version had these errors that MUST be fixed:
                {chr(10).join(f'- {e}' for e in review_errors)}

                You MUST address all of these errors in your merged output.
                """

    prompt = f"""You are a senior code aggregator. Your job is to merge 3 coding agent outputs into a working, production-ready codebase.

                Original Task: {original_task}

                Shared Contract (overall structure all agents agreed on):
                {shared_contract}

                Coder Outputs (each coder includes code + explanation separated by "---"):
                {coder_sections}
                {error_section}
                
                CRITICAL INSTRUCTIONS:
                1. Output MULTIPLE files if the task naturally requires it
                2. Use this EXACT format to separate files — NO markdown fences, ONLY use the file separator:
                # === FILE: filename ===
                [raw code content here, NO fences]
                
                # === FILE: another_file ===
                [raw code content here, NO fences]

                3. Preserve the explanations from each coder. Write them in response in such manner that it preserve the Explantions as well as the Flow.
                4. Do NOT add new functionality — only merge, fix references, and ensure interoperability
                5. ABSOLUTELY DO NOT use markdown code fences (```) — output raw code only.

                Merged code:"""

    response = await llm.ainvoke([HumanMessage(content=prompt)])
    return {"merged_code": response.content}


# ─── Code Reviewer Node ───────────────────────────────────────────────────────

async def code_reviewer_node(state: CodingAgentState) -> dict:
    """Reviews merged code for correctness and returns scores + errors."""
    llm = get_llm(temperature=0.1, change=True)
    merged_code = state["merged_code"]
    original_task = state["original_task"]
    retry_count = state.get("retry_count", 0)

    prompt = f"""You are a strict code reviewer. Evaluate the following merged code for correctness, completeness, and quality.

            Original Task: {original_task}

            Code to Review:
            {merged_code}

            Provide your assessment in EXACTLY this JSON format (no other text, no markdown backticks):
            {{
            "confidence": 75-95,
            "consistency": 75-95,
            "friendly_feedback": "Brief note on quality and suggestions",
            "errors": ["Critical error 1 to be fixed", "Critical error 2 to be fixed"],
            "serious_mistakes": [
                {{
                "severity": "high",
                "description": "Critical security flaw or missing major requirement"
                }}
            ]
            }}
            If no errors or serious mistakes, make errors and serious_mistakes, arrays empty [].
            Do not include any other text except valid JSON."""

    response = await llm.ainvoke([
        SystemMessage(content="You are a data-formatting agent. Output raw JSON only."),
        HumanMessage(content=prompt)
    ])
    content = response.content.strip()
    if content.startswith("```json"):
        content = content.replace("```json", "", 1)
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    confidence = 85
    consistency = 85
    errors = []
    feedback = ""
    serious_mistakes = []

    try:
        parsed = json.loads(content)
        confidence = parsed.get("confidence", 85)
        consistency = parsed.get("consistency", 85)
        errors = parsed.get("errors", [])
        feedback = parsed.get("friendly_feedback", "")
        serious_mistakes = parsed.get("serious_mistakes", [])
    except Exception:
        pass

    return {
        "confidence_score": confidence,
        "logical_consistency": consistency,
        "review_errors": errors,
        "critic_feedback": feedback,
        "serious_mistakes": serious_mistakes,
        "retry_count": retry_count + 1,
    }


# ─── Retry Logic ──────────────────────────────────────────────────────────────

def should_retry(state: CodingAgentState) -> str:
    """Decide whether to retry aggregation or format final output."""
    if state.get("review_errors") and state["retry_count"] < 2:
        return "code_aggregator"
    return "format_output"


# ─── Format Output Node ───────────────────────────────────────────────────────

def detect_language(content: str) -> str:
    """Detect the programming language from code content."""
    content_lower = content.lower().strip()
    if "<!doctype html>" in content_lower or "<html" in content_lower or "<form" in content_lower or "<div" in content_lower:
        return "html"
    if content.strip().startswith(("body {", ".class", "#id", "@keyframes", "@media")) or "{ color:" in content or "{ background:" in content:
        return "css"
    if "function " in content or "const " in content or "let " in content or "var " in content or "document." in content or "addEventListener" in content:
        return "javascript"
    if "public class " in content or "public static void main" in content or "import java." in content:
        return "java"
    if "def " in content or "import " in content or "class " in content or "print(" in content:
        return "python"
    return "python"


async def format_output_node(state: CodingAgentState) -> dict:
    """Parses merged code into a structured list of {filename, content, language} dicts."""
    merged_code = state["merged_code"]

    # Strip any stray markdown fences first
    if "```" in merged_code:
        fenced_blocks = re.findall(r'```(\w*)\n(.*?)```', merged_code, re.DOTALL)
        if fenced_blocks:
            merged_code = "\n\n".join(block_content.strip() for _, block_content in fenced_blocks)
        else:
            merged_code = re.sub(r'```\w*\n?', '', merged_code).replace('```', '').strip()

    parsed_files = []
    file_separator = "# === FILE:"

    if file_separator in merged_code:
        file_blocks = merged_code.split(file_separator)
        for file_block in file_blocks:
            file_block = file_block.strip()
            if not file_block:
                continue
            lines = file_block.split("\n")
            filename = lines[0].strip().replace("===", "").strip()
            if not filename:
                continue
            full_content = "\n".join(lines[1:])
            # Strip explanation after "---"
            file_content = full_content
            if "\n---\n" in full_content:
                file_content = re.split(r'\n---\n', full_content, maxsplit=1)[0].strip()
            if file_content:
                parsed_files.append({
                    "filename": filename,
                    "content": file_content,
                    "language": detect_language(file_content),
                })
    else:
        all_blocks = re.findall(r'```(\w*)\n(.*?)```', merged_code, re.DOTALL)
        ext_map = {"html": "index.html", "css": "styles.css", "javascript": "script.js", "python": "main.py", "java": "Main.java"}
        if len(all_blocks) > 1:
            for idx, (lang_hint, block_content) in enumerate(all_blocks):
                block_content = block_content.strip()
                if not block_content:
                    continue
                lang = lang_hint if lang_hint else detect_language(block_content)
                filename = ext_map.get(lang, f"file_{idx + 1}.{lang or 'txt'}")
                parsed_files.append({"filename": filename, "content": block_content, "language": lang})
        else:
            # Single file fallback
            code_content = merged_code.split("\n---\n", 1)[0].strip() if "\n---\n" in merged_code else merged_code
            lang = detect_language(code_content)
            parsed_files.append({
                "filename": ext_map.get(lang, "output.txt"),
                "content": code_content,
                "language": lang,
            })

    return {"parsed_files": parsed_files}

