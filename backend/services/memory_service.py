"""
memory_service.py

Provides conversation buffer memory context for all agent pipelines.

Uses LangChain's ConversationSummaryBufferMemory to:
  1. Load past messages from Postgres (for a given conversation_id)
  2. Summarize older turns using a fast LLM when token limit is exceeded
  3. Return a formatted context string to be prepended to each new request

This context is per-conversation-id, so each thread maintains its own history.
"""

from langchain.memory import ConversationSummaryBufferMemory

from core.llm_engine import get_llm


# Maximum number of tokens to keep in the raw buffer before summarization kicks in.
# Older messages beyond this limit are auto-summarized by the LLM.
_MAX_TOKEN_LIMIT = 1500


async def get_conversation_memory_context(
    conversation_id: str,
    user_id: str,
) -> str | None:
    """
    Fetch the conversation history for the given conversation_id and return
    a LangChain-summarized memory context string ready to inject into prompts.

    Returns None if there is no prior context (new conversation or empty history).

    Logging:
        [memory_service] Loaded N turns from DB for conversation <id>
        [memory_service] Memory context built: <N> characters (X turns)
        [memory_service] No prior context found for conversation <id>
        [memory_service] ERROR <description>
    """
    try:
        from repositories.postgres_repo import get_conversation_with_messages

        print(f"[memory_service] Fetching history for conversation_id={conversation_id}, user_id={user_id}")

        # ── 1. Load raw history from Postgres ────────────────────────────────
        try:
            data = await get_conversation_with_messages(conversation_id, user_id)
        except ValueError:
            # Conversation not found (e.g., ID was just created this request)
            print(f"[memory_service] Conversation {conversation_id} not found in DB — skipping memory.")
            return None

        messages = data.get("messages", [])
        if not messages:
            print(f"[memory_service] No prior messages for conversation {conversation_id}.")
            return None

        # Build (user, assistant) pairs from the message rows.
        # Each row's `content` is a list of turn dicts: [{"user": "...", "assistant": "..."}]
        turns: list[tuple[str, str]] = []
        for msg_row in messages:
            content = msg_row.get("content", [])
            for turn in content:
                user_text = turn.get("user", "").strip()
                assistant_text = turn.get("assistant", "").strip()
                if user_text and assistant_text:
                    turns.append((user_text, assistant_text))

        print(f"[memory_service] Loaded {len(turns)} turns from DB for conversation {conversation_id}")

        if not turns:
            print(f"[memory_service] No valid user/assistant turns — skipping memory.")
            return None

        # ── 2. Feed turns into ConversationSummaryBufferMemory ───────────────
        # Using the "instant" LLM for fast summarization.
        summarizer_llm = get_llm(instant=True, temperature=0.1, change=False)

        memory = ConversationSummaryBufferMemory(
            llm=summarizer_llm,
            max_token_limit=_MAX_TOKEN_LIMIT,
            return_messages=False,          # return as plain string, not message objects
            memory_key="history",
        )

        for user_text, assistant_text in turns:
            memory.save_context(
                {"input": user_text},
                {"output": assistant_text},
            )

        # ── 3. Extract the summarized + buffered context ──────────────────────
        memory_vars = memory.load_memory_variables({})
        history_str: str = memory_vars.get("history", "").strip()

        if not history_str:
            print(f"[memory_service] Memory returned empty history string.")
            return None

        print(
            f"[memory_service] Memory context built: {len(history_str)} characters "
            f"({len(turns)} turns) for conversation {conversation_id}"
        )
        return history_str

    except Exception as e:
        print(f"[memory_service] ERROR building memory context: {e}")
        # Non-fatal — fall through without context rather than breaking a request
        return None


def format_memory_block(memory_context: str) -> str:
    """
    Wrap the raw memory context string in a clear delimiter block
    that explicitly instructs the agent to treat this as background context only.
    """
    return (
        "\n--- BACKGROUND CONVERSATION CONTEXT ---\n"
        "[SYSTEM INSTRUCTION: The following is a summary of prior turns in this conversation. "
        "Use this ONLY as context. Do NOT answer previous questions again. Focus exclusively "
        "on fulfilling the user's latest query provided below.]\n\n"
        f"{memory_context}\n"
        "--- END OF BACKGROUND CONTEXT ---\n\n"
    )
