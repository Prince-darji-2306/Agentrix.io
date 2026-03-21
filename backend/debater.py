import os
import asyncio
from typing import AsyncGenerator
from llm_engine import get_client


client = None

MODEL = "openai/gpt-oss-20b"

AGENT_A_PERSONA = """You are Agent Proposer, a confident debater who argues FOR the given topic.
You present compelling arguments, use evidence, and directly counter your opponent's points.
Be assertive but intellectually rigorous. Keep responses to 3-4 sentences max."""

AGENT_B_PERSONA = """You are Agent Critic, a sharp debater who argues AGAINST the given topic.
You challenge assumptions, present counterarguments, and expose weaknesses in opposing views.
Be direct and incisive. Keep responses to 3-4 sentences max."""

async def run_debate_stream(topic: str, rounds: int = 3) -> AsyncGenerator[dict, None]:
    groq_client = get_client()
    
    history_a = []  # Agent A's conversation history
    history_b = []  # Agent B's conversation history
    
    #this will work.
    # Opening statement setup
    opening_prompt_a = f"""The debate topic is: "{topic}"
        If user has given you any specific side than take it. Else you are arguing FOR this position. Give your opening statement."""
    
    opening_prompt_b = f"""The debate topic is: "{topic}"
        If user has given you any specific side than take it. You are arguing AGAINST this position. Give your opening statement."""
    
    yield {"type": "info", "message": f"🎭 Debate started: '{topic}' | {rounds} rounds"}
    await asyncio.sleep(0.1)
    
    last_a_message = ""
    last_b_message = ""
    
    for round_num in range(1, rounds + 1):
        yield {"type": "round", "round": round_num, "total_rounds": rounds}
        await asyncio.sleep(0.1)
        
        # ─── Agent A speaks ───────────────────────────────────────────────
        if round_num == 1:
            user_msg_a = opening_prompt_a
        else:
            user_msg_a = f"""Agent Critic said: "{last_b_message}"
            Continue the debate. Counter their argument and strengthen your position. Round {round_num} of {rounds}."""
        
        history_a.append({"role": "user", "content": user_msg_a})
        
        response_a = groq_client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "system", "content": AGENT_A_PERSONA}] + history_a,
            max_tokens=300,
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
        await asyncio.sleep(0.2)
        
        # ─── Agent B speaks ───────────────────────────────────────────────
        if round_num == 1:
            user_msg_b = opening_prompt_b
        else:
            user_msg_b = f"""Agent Proposer said: "{last_a_message}"
            Respond to their argument and reinforce your position. Round {round_num} of {rounds}."""
        
        history_b.append({"role": "user", "content": user_msg_b})
        
        response_b = groq_client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "system", "content": AGENT_B_PERSONA}] + history_b,
            max_tokens=300,
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
    
    # ─── Final verdict ────────────────────────────────────────────────────
    yield {"type": "info", "message": "⚖️ Generating debate summary..."}
    await asyncio.sleep(0.1)
    
    all_debate = ""
    for i, (ha, hb) in enumerate(zip(
        [m for m in history_a if m["role"] == "assistant"],
        [m for m in history_b if m["role"] == "assistant"],
    )):
        all_debate += f"\nRound {i+1} - FOR: {ha['content']}\nRound {i+1} - AGAINST: {hb['content']}\n"
    
    verdict_response = groq_client.chat.completions.create(
        model=MODEL,
        messages=[{
            "role": "user",
            "content": f"""Topic: "{topic}"
            
            Debate transcript:
            {all_debate}

            As an impartial judge, summarize the key arguments made by both sides and provide a balanced verdict on who made stronger arguments and why. Be concise (6-7 sentences)."""
                    }],
                    max_tokens=400,
                    temperature=0.3,
                )
    
    verdict = verdict_response.choices[0].message.content
    
    yield {
        "type": "verdict",
        "content": verdict,
    }
