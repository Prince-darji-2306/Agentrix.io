import os
import asyncio
from typing import AsyncGenerator
from core.llm_engine import get_client


MODEL = "openai/gpt-oss-20b"

AGENT_A_PERSONA = """You are Agent Proposer, a confident debater who argues FOR the given topic.
You present compelling arguments, use evidence, and directly counter your opponent's points.
Be assertive but intellectually rigorous. Keep responses to 3-4 sentences max."""

AGENT_B_PERSONA = """You are Agent Critic, a sharp debater who argues AGAINST the given topic.
You challenge assumptions, present counterarguments, and expose weaknesses in opposing views.
Be direct and incisive. Keep responses to 3-4 sentences max."""


def get_agent_a_persona() -> str:
    """Return the Proposer persona."""
    return AGENT_A_PERSONA


def get_agent_b_persona() -> str:
    """Return the Critic persona."""
    return AGENT_B_PERSONA


def get_debate_model() -> str:
    """Return the debate model name."""
    return MODEL