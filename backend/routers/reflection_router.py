from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException

from core import get_current_user
from repositories import get_pool

router = APIRouter(prefix="/reflection", tags=["reflection"])


def _clamp_score(value: float, minimum: int = 0, maximum: int = 100) -> int:
    return max(minimum, min(maximum, round(value)))


def _normalize_to_percent(value: float | None) -> float | None:
    if value is None:
        return None
    return value * 100 if value <= 1 else value


def _default_improvement(severity: str) -> str:
    if severity == "high":
        return "Escalated to stricter validation and cross-checking gates."
    if severity == "medium":
        return "Added additional reasoning checks before final response."
    return "Applied lightweight post-response self-review for similar prompts."


def _default_strategy(severity: str) -> str:
    if severity == "high":
        return "Require tool-backed evidence and second-pass verification for claims."
    if severity == "medium":
        return "Increase consistency checks on multi-step reasoning chains."
    return "Track pattern frequency and auto-flag repeated low-severity slips."


def _build_radar(
    confidence_score: int,
    logical_consistency: int,
    factual_reliability: int,
    self_correction_triggered: bool,
    issue_count: int,
    high_severity_count: int,
) -> list[dict]:
    adaptation = _clamp_score(
        72
        + (14 if self_correction_triggered else 4)
        - (high_severity_count * 4)
        - min(issue_count, 6)
    )
    return [
        {"metric": "Planning", "value": logical_consistency},
        {"metric": "Reasoning", "value": confidence_score},
        {"metric": "Verification", "value": factual_reliability},
        {"metric": "Adaptation", "value": adaptation},
        {"metric": "Confidence", "value": confidence_score},
    ]


@router.get("")
@router.get("/summary")
async def get_reflection_summary(user_id: str = Depends(get_current_user)):
    """
    User-scoped reflection summary:
    - confidence / logical consistency from messages table (all user conversations)
    - reflection report issues from detected_mistakes
    """
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            quality_row = await conn.fetchrow(
                """
                SELECT
                    AVG(m.confidence) AS avg_confidence,
                    AVG(m.consistency) AS avg_consistency,
                    COUNT(m.id) AS message_count
                FROM messages m
                JOIN conversations c ON c.id = m.conversation_id
                WHERE c.user_id = $1
                """,
                uuid.UUID(user_id),
            )

            mistakes = await conn.fetch(
                """
                SELECT id, description, severity
                FROM detected_mistakes
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT 200
                """,
                uuid.UUID(user_id),
            )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    avg_confidence = _normalize_to_percent(
        float(quality_row["avg_confidence"])
        if quality_row and quality_row["avg_confidence"] is not None
        else None
    )
    avg_consistency = _normalize_to_percent(
        float(quality_row["avg_consistency"])
        if quality_row and quality_row["avg_consistency"] is not None
        else None
    )

    confidence_score = _clamp_score(avg_confidence if avg_confidence is not None else 82)
    logical_consistency = _clamp_score(avg_consistency if avg_consistency is not None else 84)

    severity_count = {"high": 0, "medium": 0, "low": 0}
    issues = []
    for idx, row in enumerate(mistakes):
        severity = str(row["severity"] or "medium").lower()
        if severity not in severity_count:
            severity = "medium"
        severity_count[severity] += 1
        issues.append(
            {
                "id": str(row["id"]),
                "issue": row["description"] or "Detected reasoning issue.",
                "improvement": _default_improvement(severity),
                "strategy": _default_strategy(severity),
                "severity": severity,
            }
        )

    message_count = int(quality_row["message_count"]) if quality_row and quality_row["message_count"] else 0
    issue_penalty = (
        severity_count["high"] * 12
        + severity_count["medium"] * 7
        + severity_count["low"] * 4
    )
    density_penalty = (
        min(15, round((len(issues) / message_count) * 30)) if message_count > 0 else 0
    )
    factual_reliability = _clamp_score(92 - issue_penalty - density_penalty, 35, 98)
    self_correction_triggered = len(issues) > 0

    return {
        "scores": {
            "confidenceScore": confidence_score,
            "logicalConsistency": logical_consistency,
            "factualReliability": factual_reliability,
            "selfCorrectionTriggered": self_correction_triggered,
        },
        "radarData": _build_radar(
            confidence_score=confidence_score,
            logical_consistency=logical_consistency,
            factual_reliability=factual_reliability,
            self_correction_triggered=self_correction_triggered,
            issue_count=len(issues),
            high_severity_count=severity_count["high"],
        ),
        "issues": issues,
    }
