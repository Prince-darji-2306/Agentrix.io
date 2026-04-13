import asyncio
import inspect
from typing import Any, AsyncGenerator

from autogen_core import CancellationToken
from autogen_agentchat.messages import TextMessage

from core import get_client
from agents import (
    create_critic_agent,
    create_proposer_agent,
    create_verifier_agent,
    get_agent_a_persona,
    get_agent_b_persona,
    get_debate_model,
)


def _phase_for_round(round_num: int, total_rounds: int) -> str:
    if round_num == 1:
        return "opening statement"
    if round_num == total_rounds:
        return "closing rebuttal"
    return "rebuttal round"


def _format_transcript(rounds_data: dict[int, dict[str, str]]) -> str:
    transcript_lines: list[str] = []
    for rnd in sorted(rounds_data.keys()):
        proposer = rounds_data[rnd].get("proposer", "").strip()
        critic = rounds_data[rnd].get("critic", "").strip()
        transcript_lines.append(f"Round {rnd} - FOR: {proposer}")
        transcript_lines.append(f"Round {rnd} - AGAINST: {critic}")
    return "\n".join(transcript_lines)


def _content_to_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        chunks: list[str] = []
        for item in content:
            if isinstance(item, str):
                chunks.append(item)
            elif isinstance(item, dict):
                text = item.get("text")
                if isinstance(text, str):
                    chunks.append(text)
        return "\n".join(part for part in chunks if part.strip())
    raise ValueError(f"Unsupported AutoGen message content type: {type(content)}")


async def _agent_reply(agent: Any, prompt: str) -> str:
    response = await agent.on_messages(
        [TextMessage(content=prompt, source="user")],
        cancellation_token=CancellationToken(),
    )
    chat_message = getattr(response, "chat_message", None)
    if chat_message is None:
        raise ValueError("AutoGen response did not include chat_message.")

    text = _content_to_text(getattr(chat_message, "content", ""))
    cleaned = text.strip()
    if not cleaned:
        raise ValueError("AutoGen response content is empty.")
    return cleaned


async def _close_agent_model_client(agent: Any) -> None:
    model_client = getattr(agent, "model_client", None)
    if model_client is None:
        return

    close_fn = getattr(model_client, "close", None)
    if close_fn is None:
        return

    result = close_fn()
    if inspect.isawaitable(result):
        await result


async def run_debate_stream_raw(topic: str, rounds: int = 3) -> AsyncGenerator[dict, None]:
    """Stream a debate using raw Groq API (original implementation)."""
    groq_client = get_client()
    model = get_debate_model()
    persona_a = get_agent_a_persona()
    persona_b = get_agent_b_persona()

    history_a = []
    history_b = []

    yield {"type": "info", "message": f"🎭 Debate started: '{topic}' | {rounds} rounds"}
    await asyncio.sleep(0.2)

    last_a_message = ""
    last_b_message = ""

    for round_num in range(1, rounds + 1):
        yield {"type": "round", "round": round_num, "total_rounds": rounds}
        await asyncio.sleep(0.1)

        # Agent A (Proposer)
        if round_num == 1:
            user_msg_a = f'The debate topic is: "{topic}". You are arguing FOR this position. Give your opening statement.'
        else:
            user_msg_a = f'Agent Critic said: "{last_b_message}"\nContinue the debate. Counter their argument and strengthen your position. Round {round_num} of {rounds}.'

        history_a.append({"role": "user", "content": user_msg_a})
        response_a = groq_client.chat.completions.create(
            model=model,
            messages=[{"role": "system", "content": persona_a}] + history_a,
            temperature=0.7,
        )
        msg_a = response_a.choices[0].message.content
        history_a.append({"role": "assistant", "content": msg_a})
        last_a_message = msg_a

        yield {
            "type": "message",
            "agent": "Agent Proposer",
            "agent_id": "A",
            "position": "FOR",
            "round": round_num,
            "content": msg_a,
        }
        await asyncio.sleep(0.1)

        # Agent B (Critic)
        if round_num == 1:
            user_msg_b = f'The debate topic is: "{topic}". You are arguing AGAINST this position. Give your opening statement.'
        else:
            user_msg_b = f'Agent Proposer said: "{last_a_message}"\nRespond to their argument and reinforce your position. Round {round_num} of {rounds}.'

        history_b.append({"role": "user", "content": user_msg_b})
        response_b = groq_client.chat.completions.create(
            model=model,
            messages=[{"role": "system", "content": persona_b}] + history_b,
            temperature=0.7,
        )
        msg_b = response_b.choices[0].message.content
        history_b.append({"role": "assistant", "content": msg_b})
        last_b_message = msg_b

        yield {
            "type": "message",
            "agent": "Agent Critic",
            "agent_id": "B",
            "position": "AGAINST",
            "round": round_num,
            "content": msg_b,
        }
        await asyncio.sleep(0.2)

    # Verdict
    yield {"type": "info", "message": "⚖️ Generating debate summary..."}
    await asyncio.sleep(0.01)

    all_debate = ""
    for i, (ha, hb) in enumerate(zip(
        [m for m in history_a if m["role"] == "assistant"],
        [m for m in history_b if m["role"] == "assistant"],
    )):
        all_debate += f"\nRound {i+1} - FOR: {ha['content']}\nRound {i+1} - AGAINST: {hb['content']}\n"

    verdict_response = groq_client.chat.completions.create(
        model=model,
        messages=[{
            "role": "user",
            "content": f"""Topic: "{topic}"

Debate transcript:
{all_debate}

As an impartial judge, summarize the key arguments made by both sides and provide a balanced verdict on who made stronger arguments and why. Be concise (6-7 sentences)."""
        }],
        temperature=0.3,
    )

    verdict = verdict_response.choices[0].message.content

    yield {
        "type": "verdict",
        "content": verdict,
    }


async def run_debate_stream_autogen(topic: str, rounds: int = 3) -> AsyncGenerator[dict, None]:
    """Stream a debate between Agent Proposer and Agent Critic using AutoGen."""
    proposer_agent = create_proposer_agent()
    critic_agent = create_critic_agent()
    verifier_agent = create_verifier_agent()

    rounds_data: dict[int, dict[str, str]] = {}

    yield {"type": "info", "message": f"🎭 Debate started: '{topic}' | {rounds} rounds"}
    await asyncio.sleep(0.2)

    try:
        for round_num in range(1, rounds + 1):
            phase = _phase_for_round(round_num, rounds)
            yield {"type": "round", "round": round_num, "total_rounds": rounds}
            await asyncio.sleep(0.1)

            transcript = _format_transcript(rounds_data)
            proposer_prompt = (
                f"Debate topic: \"{topic}\"\n"
                f"Current phase: {phase}\n"
                "Role: You must argue FOR the topic.\n"
                "Rules: Provide one clear claim, one support, and one direct rebuttal "
                "to the strongest opposing point seen so far.\n"
                f"Transcript so far:\n{transcript if transcript else 'No prior rounds.'}\n"
                "Respond in 3-4 sentences."
            )

            proposer_msg = await _agent_reply(proposer_agent, proposer_prompt)
            if round_num not in rounds_data:
                rounds_data[round_num] = {"proposer": "", "critic": ""}
            rounds_data[round_num]["proposer"] = proposer_msg

            yield {
                "type": "message",
                "agent": "Agent Proposer",
                "agent_id": "A",
                "position": "FOR",
                "round": round_num,
                "content": proposer_msg,
            }
            await asyncio.sleep(0.4)

            transcript = _format_transcript(rounds_data)
            critic_prompt = (
                f"Debate topic: \"{topic}\"\n"
                f"Current phase: {phase}\n"
                "Role: You must argue AGAINST the topic.\n"
                "Rules: Address Proposer's latest claim directly, expose one weakness, "
                "and present one counter-claim with support.\n"
                f"Transcript so far:\n{transcript}\n"
                "Respond in 3-4 sentences."
            )

            critic_msg = await _agent_reply(critic_agent, critic_prompt)
            rounds_data[round_num]["critic"] = critic_msg

            yield {
                "type": "message",
                "agent": "Agent Critic",
                "agent_id": "B",
                "position": "AGAINST",
                "round": round_num,
                "content": critic_msg,
            }
            await asyncio.sleep(0.2)

        yield {"type": "info", "message": "⚖️ Generating debate summary..."}
        await asyncio.sleep(0.01)

        final_transcript = _format_transcript(rounds_data)
        verdict_prompt = (
            f"Topic: \"{topic}\"\n"
            "You are the impartial verifier. Evaluate the debate below.\n"
            "Scoring criteria: argument strength, evidence quality, and logical consistency.\n"
            "Output requirements: 6-7 sentences, balanced summary, and explicit winner with reason.\n"
            f"Debate transcript:\n{final_transcript}"
        )
        verdict = await _agent_reply(verifier_agent, verdict_prompt)

        yield {
            "type": "verdict",
            "content": verdict,
        }
    finally:
        await _close_agent_model_client(proposer_agent)
        await _close_agent_model_client(critic_agent)
        await _close_agent_model_client(verifier_agent)


async def run_debate_stream(
    topic: str,
    rounds: int = 3,
    mode: str = "autogen"
) -> AsyncGenerator[dict, None]:
    """
    Route to appropriate debate implementation based on mode.

    Args:
        topic: Debate topic
        rounds: Number of debate rounds
        mode: "raw" for original Groq API, "autogen" for AutoGen orchestration

    Yields:
        SSE events (same format for both modes)

    Raises:
        ValueError: If mode is not "raw" or "autogen"
    """
    if mode.lower() not in ("raw", "autogen"):
        raise ValueError(f"Invalid debate mode: {mode}. Must be 'raw' or 'autogen'.")

    if mode.lower() == "raw":
        async for event in run_debate_stream_raw(topic, rounds):
            yield event
    else:  # autogen
        async for event in run_debate_stream_autogen(topic, rounds):
            yield event



def structure_debate_rounds(debate_events: list[dict]) -> list[dict]:
    """
    Convert raw debate events into structured rounds format:
    [{"proposer": "...", "critic": "..."}, ...]
    """
    rounds_data: dict[int, dict] = {}
    for evt in debate_events:
        if evt.get("type") == "message":
            rnd = evt.get("round", 0)
            if rnd not in rounds_data:
                rounds_data[rnd] = {"proposer": "", "critic": ""}
            if evt.get("agent_id") == "A":
                rounds_data[rnd]["proposer"] = evt.get("content", "")
            elif evt.get("agent_id") == "B":
                rounds_data[rnd]["critic"] = evt.get("content", "")
    return [rounds_data[k] for k in sorted(rounds_data.keys())]
