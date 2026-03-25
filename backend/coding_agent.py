import json
import asyncio
from typing import Callable
from llm_engine import get_llm
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


# ─── Code Planner Node ───────────────────────────────────────────────────────

async def code_planner_node(state: CodingAgentState) -> dict:
    """Decomposes the task into 3 coding subtasks with shared interface."""
    llm = get_llm(temperature=0.1, change=False)
    task = state["original_task"]

    prompt = f"""You are a senior software architect. Given the following coding task, break it into exactly 3 independent subtasks that can be implemented in parallel.

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
                "description": "Clear description of what this subtask implements (e.g., 'Create the HTML structure for the login form with input fields and buttons')",
                "signatures": ["Describe the key elements/functions this subtask should produce (e.g., '<form> with email and password inputs', 'Submit button with hover effect')"]
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
            "shared_contract": "Overall structure and interfaces that all agents must respect (e.g., file organization, naming conventions, shared IDs/classes, API contracts)"
            }}

            Each subtask should be independently implementable. The shared_contract must describe the overall structure so each coder knows how their work fits with others."""

    response = await llm.ainvoke([
        SystemMessage(content="You are a software architect. Output only valid JSON."),
        HumanMessage(content=prompt),
    ])

    # Parse JSON response
    try:
        content = response.content.strip()
        # Try to extract JSON from the response
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        parsed = json.loads(content)
        subtasks = parsed.get("subtasks", [])
        shared_contract = parsed.get("shared_contract", "")
    except Exception:
        # Fallback to 3 generic subtasks
        subtasks = [
            {"id": 1, "description": f"Implement core data structures for: {task}", "signatures": ["Core structures and data types"]},
            {"id": 2, "description": f"Implement main algorithm/logic for: {task}", "signatures": ["Main logic and algorithms"]},
            {"id": 3, "description": f"Implement helper functions and utilities for: {task}", "signatures": ["Helper functions and utilities"]},
        ]
        shared_contract = "All agents should implement their assigned parts with clear interfaces."

    # Ensure we have exactly 3 subtasks
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
4. Write clean, well-documented code in whatever language best fits the task (Python, HTML, CSS, JavaScript, Java, etc.)
5. Include comments explaining complex logic
6. After your code, provide a brief explanation separated by "---"

OUTPUT FORMAT:
Write your code first, then after a line with "---", write a brief explanation of what your code does and how it works.

Example:
```html
<form id="login-form">
  <input type="email" name="email" placeholder="Email">
  <button type="submit">Login</button>
</form>
---
This HTML creates a login form with an email input field and a submit button. The form uses the id "login-form" for JavaScript targeting.
```

Write your implementation:"""

        response = await llm.ainvoke([
            SystemMessage(content="You are a coding agent. Write clean, well-documented code in whatever language best fits the task. After your code, provide a brief explanation."),
            HumanMessage(content=prompt),
        ])
        return response.content

    # Run all 3 coders in parallel
    tasks = [run_coder(subtasks[i], i) for i in range(min(3, len(subtasks)))]
    results = await asyncio.gather(*tasks)

    # Strip markdown fences from coder outputs to ensure clean raw code
    import re
    cleaned_results = []
    for result in results:
        # Remove ```lang ... ``` fences if present
        cleaned = re.sub(r'```\w*\n', '', result)
        cleaned = cleaned.replace('```', '').strip()
        cleaned_results.append(cleaned)
    results = cleaned_results

    # Pad results if fewer than 3
    while len(results) < 3:
        results.append("# No implementation provided")

    return {"coder_results": list(results)}


# ─── Code Aggregator Node ─────────────────────────────────────────────────────

async def code_aggregator_node(state: CodingAgentState) -> dict:
    """Merges 3 coder outputs into one coherent codebase (single or multi-file)."""
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
1. You may output MULTIPLE files if the task naturally requires it (e.g., index.html, styles.css, script.js or main.py, utils.py)

2. Use this EXACT format to separate files — NO markdown fences (no ```), ONLY use the file separator:
   # === FILE: filename ===
   [raw code content here, NO fences]
   
   # === FILE: another_file ===
   [raw code content here, NO fences]

3. Preserve the explanations from each coder — include them after each file's code separated by "---"

4. RULES FOR MULTI-FILE OUTPUT:
   - Each file must be self-contained with its own imports/includes at the top
   - Cross-file references must use the correct syntax for the language (e.g., Python imports, HTML script tags, CSS link tags)
   - Each file must be independently functional
   - Remove any duplicate code across files
   - Ensure all code is properly ordered (dependencies first within each file)

5. RULES FOR SINGLE-FILE OUTPUT:
   - If a single file is sufficient, just output the code without file separators
   - Remove duplicate code and imports
   - Ensure proper ordering (dependencies first)

6. Do NOT add new functionality — only merge, fix references, and ensure interoperability

7. For each file, include the explanation from the coder who wrote that section

8. ABSOLUTELY DO NOT use markdown code fences (```) — output raw code only. The file separator format above is the ONLY valid format.

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

Provide your assessment in EXACTLY this format:

CONFIDENCE: [0-100] - How confident are you this code is correct and complete?
CONSISTENCY: [0-100] - How logically sound and well-structured is the code?
ERRORS: [List each critical error on a new line starting with "- ", or "NONE" if no errors]
FEEDBACK: [Brief note on quality and any suggestions]

Do not include any other text."""

    response = await llm.ainvoke([HumanMessage(content=prompt)])
    critique = response.content.strip()

    confidence = 85
    consistency = 85
    errors: list[str] = []
    feedback = ""

    try:
        for line in critique.split("\n"):
            line = line.strip()
            if line.startswith("CONFIDENCE:"):
                confidence = int(line.split(":")[1].strip().split()[0])
            elif line.startswith("CONSISTENCY:"):
                consistency = int(line.split(":")[1].strip().split()[0])
            elif line.startswith("ERRORS:"):
                error_text = line.split(":", 1)[1].strip()
                if error_text and error_text != "NONE":
                    errors.append(error_text)
            elif line.startswith("- "):
                errors.append(line[2:].strip())
            elif line.startswith("FEEDBACK:"):
                feedback = line.split(":", 1)[1].strip()
    except Exception:
        pass

    return {
        "confidence_score": confidence,
        "logical_consistency": consistency,
        "review_errors": errors,
        "critic_feedback": feedback,
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
    # HTML detection
    if "<!doctype html>" in content_lower or "<html" in content_lower or "<form" in content_lower or "<div" in content_lower:
        return "html"
    # CSS detection
    if content.strip().startswith(("body {", ".class", "#id", "@keyframes", "@media")) or "{ color:" in content or "{ background:" in content:
        return "css"
    # JavaScript detection
    if "function " in content or "const " in content or "let " in content or "var " in content or "document." in content or "addEventListener" in content:
        return "javascript"
    # Java detection
    if "public class " in content or "public static void main" in content or "import java." in content:
        return "java"
    # Python detection (default for .py files or python keywords)
    if "def " in content or "import " in content or "class " in content or "print(" in content:
        return "python"
    # Default
    return "python"


async def format_output_node(state: CodingAgentState) -> dict:
    """Composes final markdown output with approach and code (problem understanding sent separately)."""
    import re

    subtasks = state["subtasks"]
    merged_code = state["merged_code"]

    # Build approach section with agent assignments
    approach_lines = []
    for st in subtasks:
        agent_name = f"Coding Agent {st['id']}"
        approach_lines.append(f"- **{agent_name}**: {st['description']}")
    approach_section = "\n".join(approach_lines)

    # SAFETY NET: Strip ALL markdown fences from aggregator output
    # The aggregator should not produce fences, but handle it if it does
    code = merged_code
    if "```" in code:
        # Find ALL code blocks and extract their content
        fenced_blocks = re.findall(r'```(\w*)\n(.*?)```', code, re.DOTALL)
        if fenced_blocks:
            # Join all code block contents (strip fences)
            code = "\n\n".join(block_content.strip() for _, block_content in fenced_blocks)
        else:
            # Fallback: just remove fence markers
            code = re.sub(r'```\w*\n?', '', code).replace('```', '').strip()

    # Detect if multi-file output (contains file separators)
    file_separator = "# === FILE:"
    if file_separator in code:
        # Split into individual files and wrap each in its own code block
        file_blocks = code.split(file_separator)
        code_blocks = []
        for file_block in file_blocks:
            file_block = file_block.strip()
            if not file_block:
                continue
            # Extract filename from header line
            lines = file_block.split("\n")
            header_line = lines[0].strip()
            # Clean up filename: remove === and whitespace
            filename = header_line.replace("===", "").strip()
            if not filename:
                continue

            # Remaining content is the file content
            content_lines = lines[1:]
            full_content = "\n".join(content_lines)

            # Check if there's an explanation separator ("---")
            explanation = ""
            file_content = full_content
            if "\n---\n" in full_content or full_content.startswith("---\n") or "\n---" in full_content:
                # Split on the first occurrence of --- on its own line
                parts = re.split(r'\n---\n', full_content, maxsplit=1)
                file_content = parts[0].strip()
                if len(parts) > 1:
                    explanation = parts[1].strip()
            elif "---" in full_content and "\n" in full_content:
                # Try splitting on --- that appears on its own line
                parts = full_content.split("\n---\n", 1)
                file_content = parts[0].strip()
                if len(parts) > 1:
                    explanation = parts[1].strip()

            if file_content:
                lang = detect_language(file_content)
                block = f"### `{filename}`\n\n```{lang}\n{file_content}\n```"
                if explanation:
                    block += f"\n\n**Explanation:** {explanation}"
                code_blocks.append(block)
        code_section = "\n\n---\n\n".join(code_blocks)
    else:
        # Single file output — may still have multiple code blocks from different coders
        # Try to detect if there are multiple code blocks embedded
        all_blocks = re.findall(r'```(\w*)\n(.*?)```', code, re.DOTALL)

        if len(all_blocks) > 1:
            # Multiple code blocks without file separators — treat each as a separate file
            code_blocks = []
            for idx, (lang_hint, block_content) in enumerate(all_blocks):
                block_content = block_content.strip()
                if not block_content:
                    continue
                lang = lang_hint if lang_hint else detect_language(block_content)
                # Generate filename from language
                ext_map = {"html": "index.html", "css": "styles.css", "javascript": "script.js", "python": "main.py", "java": "Main.java"}
                filename = ext_map.get(lang, f"file_{idx + 1}.{lang}")
                block = f"### `{filename}`\n\n```{lang}\n{block_content}\n```"
                code_blocks.append(block)
            code_section = "\n\n---\n\n".join(code_blocks)
        else:
            # True single file output
            # Check if there's an explanation separator
            explanation = ""
            code_content = code
            if "\n---\n" in code:
                parts = code.split("\n---\n", 1)
                code_content = parts[0].strip()
                if len(parts) > 1:
                    explanation = parts[1].strip()
            elif "---" in code:
                parts = code.split("---", 1)
                code_content = parts[0].strip()
                if len(parts) > 1:
                    explanation = parts[1].strip()

            lang = detect_language(code_content)
            code_section = f"```{lang}\n{code_content}\n```"
            if explanation:
                code_section += f"\n\n**Explanation:** {explanation}"

    # Note: Problem Understanding is sent separately via early code_section event
    # This output only contains Approach and Code to avoid duplication
    final_output = f"""## Approach/Plan

The task was decomposed into 3 parallel subtasks assigned to specialized coding agents:

{approach_section}

All agents respected a shared contract of function signatures to ensure interoperability.

## Code

{code_section}"""

    return {"final_output": final_output}


# ─── Parse Sections for Progressive Streaming ─────────────────────────────────

def parse_sections(output: str) -> list[tuple[str, str]]:
    """Parse the final output into sections for progressive streaming."""
    sections = []
    current_section = ""
    current_content = []

    for line in output.split("\n"):
        if line.startswith("## "):
            if current_section and current_content:
                sections.append((current_section, "\n".join(current_content)))
            header = line[3:].strip().lower()
            if "problem" in header:
                current_section = "problem_understanding"
            elif "approach" in header or "plan" in header:
                current_section = "approach"
            elif "code" in header:
                current_section = "code"
            else:
                current_section = header.replace(" ", "_")
            current_content = []
        else:
            current_content.append(line)

    if current_section and current_content:
        sections.append((current_section, "\n".join(current_content)))

    return sections


# ─── Public Entry Point ───────────────────────────────────────────────────────

async def run_coding_agent(task: str, emit: Callable) -> None:
    """Run the full coding pipeline with SSE emissions."""
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
    await emit({"type": "node_update", "node_id": "code_planner", "status": "running",
                "label": "Code Planner", "node_type": "planner",
                "x": NODE_COORDS["code_planner"]["x"], "y": NODE_COORDS["code_planner"]["y"], "output": None})
    planner_result = await code_planner_node(state)
    state.update(planner_result)
    await emit({"type": "node_update", "node_id": "code_planner", "status": "completed",
                "label": "Code Planner", "node_type": "planner",
                "x": NODE_COORDS["code_planner"]["x"], "y": NODE_COORDS["code_planner"]["y"],
                "output": f"Created {len(state['subtasks'])} subtasks"})

    # Emit plan event
    await emit({"type": "plan", "subtasks": [
        {"id": st["id"], "description": st["description"], "signatures": st.get("signatures", [])}
        for st in state["subtasks"]
    ]})

    # 2. Parallel Coders - emit running state
    for i in range(3):
        coder_id = f"coder_{i+1}"
        await emit({"type": "node_update", "node_id": coder_id, "status": "running",
                    "label": f"Coding Agent {i+1}", "node_type": "coder",
                    "x": NODE_COORDS[coder_id]["x"], "y": NODE_COORDS[coder_id]["y"], "output": None})

    # Run coders
    coder_result = await parallel_coders_node(state)
    state.update(coder_result)

    # Emit completed state for each coder
    for i in range(3):
        coder_id = f"coder_{i+1}"
        output_preview = state["coder_results"][i][:200] + "..." if len(state["coder_results"][i]) > 200 else state["coder_results"][i]
        await emit({"type": "node_update", "node_id": coder_id, "status": "completed",
                    "label": f"Coding Agent {i+1}", "node_type": "coder",
                    "x": NODE_COORDS[coder_id]["x"], "y": NODE_COORDS[coder_id]["y"],
                    "output": output_preview})

    # 3. Aggregator-Reviewer Loop (max 2 retries)
    while True:
        # Aggregator
        await emit({"type": "node_update", "node_id": "code_aggregator", "status": "running",
                    "label": "Code Aggregator", "node_type": "aggregator",
                    "x": NODE_COORDS["code_aggregator"]["x"], "y": NODE_COORDS["code_aggregator"]["y"], "output": None})
        aggregator_result = await code_aggregator_node(state)
        state.update(aggregator_result)
        await emit({"type": "node_update", "node_id": "code_aggregator", "status": "completed",
                    "label": "Code Aggregator", "node_type": "aggregator",
                    "x": NODE_COORDS["code_aggregator"]["x"], "y": NODE_COORDS["code_aggregator"]["y"],
                    "output": f"Merged {len(state['coder_results'])} coder outputs"})

        # Reviewer
        await emit({"type": "node_update", "node_id": "code_reviewer", "status": "running",
                    "label": "Code Reviewer", "node_type": "reviewer",
                    "x": NODE_COORDS["code_reviewer"]["x"], "y": NODE_COORDS["code_reviewer"]["y"], "output": None})
        reviewer_result = await code_reviewer_node(state)
        state.update(reviewer_result)
        await emit({"type": "node_update", "node_id": "code_reviewer", "status": "completed",
                    "label": "Code Reviewer", "node_type": "reviewer",
                    "x": NODE_COORDS["code_reviewer"]["x"], "y": NODE_COORDS["code_reviewer"]["y"],
                    "output": f"Confidence: {state['confidence_score']}% | Errors: {len(state['review_errors'])}"})

        # Check if we should retry
        if should_retry(state) == "format_output":
            break

    # 4. Format Output
    await emit({"type": "node_update", "node_id": "output", "status": "running",
                "label": "Final Output", "node_type": "output",
                "x": NODE_COORDS["output"]["x"], "y": NODE_COORDS["output"]["y"], "output": None})
    format_result = await format_output_node(state)
    state.update(format_result)
    await emit({"type": "node_update", "node_id": "output", "status": "completed",
                "label": "Final Output", "node_type": "output",
                "x": NODE_COORDS["output"]["x"], "y": NODE_COORDS["output"]["y"],
                "output": "Code generation complete"})

    # Stream sections progressively
    for section, content in parse_sections(state["final_output"]):
        await emit({"type": "code_section", "section": section, "content": content})

    # Final result
    await emit({"type": "final", "result": state["final_output"], "meta": {
        "confidence_score": state["confidence_score"],
        "logical_consistency": state["logical_consistency"],
        "critic_feedback": state["critic_feedback"],
        "retry_count": state["retry_count"],
        "tools_used": [],
    }})