"""
Shared JSON parsing and text normalization utilities.

Used by coding_agent and orchestrator_agent for consistent
handling of LLM-generated JSON responses with markdown code fences,
extraction, normalization, and scoring.

This module is the single source of truth for:
- JSON parsing with fallback strategies
- Text normalization and validation
- Score clamping to valid ranges
- Mistake/error list normalization
"""

import json
from typing import Any


# Configuration constants - single source of truth
SCORE_MIN = 0
SCORE_MAX = 100
VALID_SEVERITIES = {"low", "medium", "high", "critical"}


def sanitize_fenced_json(raw_text: str) -> str:
    """
    Remove markdown code fences from JSON string.
    
    Handles:
    - Triple backticks (```json ... ```)
    - Plain triple backticks (``` ... ```)
    - "json" language prefix
    
    Args:
        raw_text: Raw text potentially containing JSON with markdown fences
        
    Returns:
        Cleaned JSON string without fences
    """
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


def extract_first_json_object(text: str) -> str:
    """
    Extract the first valid JSON object from text.
    
    Handles nested braces and string escaping correctly.
    Stops at the first complete object (depth 0).
    
    Args:
        text: Text potentially containing JSON object
        
    Returns:
        First JSON object as string, or empty string if not found
    """
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


def load_json_object(raw_text: str) -> dict[str, Any]:
    """
    Parse JSON with multiple fallback strategies.
    
    Tries in order:
    1. Sanitized text (with fences removed)
    2. Extracted first JSON object
    
    Args:
        raw_text: Raw text containing JSON (possibly with markdown fences)
        
    Returns:
        Parsed JSON as dictionary
        
    Raises:
        ValueError: If JSON cannot be parsed or root is not an object
    """
    sanitized = sanitize_fenced_json(raw_text)
    candidates = [sanitized]

    extracted = extract_first_json_object(sanitized)
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
            raise ValueError("JSON response root must be an object, not list or primitive.")
        return parsed

    raise ValueError(f"Unable to parse JSON response: {last_error}")


def normalize_text(value: Any) -> str:
    """
    Convert any value to a non-empty string.
    
    Handles:
    - None → empty string
    - Strings → stripped
    - Other types → converted to string then stripped
    
    Args:
        value: Value to normalize
        
    Returns:
        Normalized string (may be empty)
    """
    if value is None:
        return ""
    return value.strip() if isinstance(value, str) else str(value).strip()


def clamp_score(value: Any, default: int) -> int:
    """
    Clamp numeric value to valid score range [SCORE_MIN, SCORE_MAX].
    
    Falls back to default if value cannot be converted to number.
    
    Args:
        value: Value to clamp (any type, will attempt numeric conversion)
        default: Default value if conversion fails or None
        
    Returns:
        Clamped integer in range [SCORE_MIN, SCORE_MAX]
    """
    try:
        numeric = int(round(float(value)))
    except (TypeError, ValueError):
        numeric = default
    return max(SCORE_MIN, min(SCORE_MAX, numeric))


def normalize_errors(value: Any) -> list[str]:
    """
    Normalize list of error/issue descriptions.
    
    Handles:
    - Strings converted to list
    - Non-list types → empty list
    - Each item stripped and deduplicated (empty items removed)
    
    Args:
        value: Error value (string or list)
        
    Returns:
        List of non-empty normalized error strings
    """
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, list):
        return []

    normalized: list[str] = []
    for item in value:
        item_text = normalize_text(item)
        if item_text:
            normalized.append(item_text)
    return normalized


def normalize_serious_mistakes(value: Any) -> list[dict]:
    """
    Normalize mistakes/issues list from LLM response.
    
    Converts various formats to consistent structure:
    {
        "severity": str (one of VALID_SEVERITIES, defaults to "high"),
        "description": str (required, non-empty),
        "action": str (optional, added if present),
        "impact": str (optional, added if present)
    }
    
    Handles:
    - String items → converted to dict with "high" severity
    - Dict items → validated and normalized
    - Invalid severity → defaults to "high"
    - Empty descriptions → skipped
    
    Args:
        value: Mistakes value (list or non-list)
        
    Returns:
        List of normalized mistake dicts
    """
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

        description = normalize_text(item.get("description"))
        if not description:
            continue

        severity = normalize_text(item.get("severity")).lower() or "high"
        if severity not in VALID_SEVERITIES:
            severity = "high"

        normalized_item = {"severity": severity, "description": description}

        action = normalize_text(item.get("action"))
        if action:
            normalized_item["action"] = action

        impact = normalize_text(item.get("impact"))
        if impact:
            normalized_item["impact"] = impact

        normalized.append(normalized_item)

    return normalized
