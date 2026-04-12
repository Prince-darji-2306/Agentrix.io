from typing import Any
from autogen_agentchat.agents import AssistantAgent
from core import get_autogen_groq_client

MODEL = "openai/gpt-oss-20b"

AGENT_A_PERSONA = """You are Agent Proposer, a confident debater who argues FOR the given topic.
You present compelling arguments, use evidence, and directly counter your opponent's points.
Be assertive but intellectually rigorous. Keep responses to 3-4 sentences max."""

AGENT_B_PERSONA = """You are Agent Critic, a sharp debater who argues AGAINST the given topic.
You challenge assumptions, present counterarguments, and expose weaknesses in opposing views.
Be direct and incisive. Keep responses to 3-4 sentences max."""

VERIFIER_PERSONA = """You are Agent Verifier, an impartial debate judge.
Evaluate both sides using argument quality, evidence quality, and internal consistency.
Return a concise verdict in 6-7 sentences, clearly stating which side argued better and why."""


def get_agent_a_persona() -> str:
    """Return the Proposer persona."""
    return AGENT_A_PERSONA


def get_agent_b_persona() -> str:
    """Return the Critic persona."""
    return AGENT_B_PERSONA


def get_debate_model() -> str:
    """Return the debate model name."""
    return MODEL


def get_verifier_persona() -> str:
    """Return the verifier persona."""
    return VERIFIER_PERSONA


def create_proposer_agent() -> Any:
    """Create a proposer debate agent using AutoGen."""
    return AssistantAgent(
        name="agent_proposer",
        model_client=get_autogen_groq_client(model=MODEL, temperature=0.7),
        system_message=AGENT_A_PERSONA,
    )


def create_critic_agent() -> Any:
    """Create a critic debate agent using AutoGen."""
    return AssistantAgent(
        name="agent_critic",
        model_client=get_autogen_groq_client(model=MODEL, temperature=0.7),
        system_message=AGENT_B_PERSONA,
    )


def create_verifier_agent() -> Any:
    """Create a verifier debate agent using AutoGen."""
    return AssistantAgent(
        name="agent_verifier",
        model_client=get_autogen_groq_client(model=MODEL, temperature=0.3),
        system_message=VERIFIER_PERSONA,
    )
