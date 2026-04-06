"""
memory_service.py

Provides conversation window memory context for all agent pipelines.

Uses a global in-memory store to keep the last 4 message turns per conversation.
This avoids calling the database on each request and is much faster than
LLM-based summarization.

The store is updated after each query/response via add_to_memory().
"""

from typing import Dict, List, Optional, Tuple
import threading

# Global in-memory store: {conversation_id: [(user_msg, assistant_msg), ...]}
# Keeps last 4 turns per conversation
_conversation_memory: Dict[str, List[Tuple[str, str]]] = {}
_memory_lock = threading.Lock()

# Window size - number of message turns to keep
_WINDOW_SIZE = 4


def add_to_memory(conversation_id: str, user_message: str, assistant_message: str) -> None:
    """
    Add a new message turn to the conversation memory.
    Keeps only the last 4 turns in memory.
    
    Called after each query/response to keep the memory updated.
    """
    global _conversation_memory
    
    with _memory_lock:
        if conversation_id not in _conversation_memory:
            _conversation_memory[conversation_id] = []
        
        # Add new turn
        _conversation_memory[conversation_id].append((user_message, assistant_message))
        
        # Keep only last WINDOW_SIZE turns
        if len(_conversation_memory[conversation_id]) > _WINDOW_SIZE:
            _conversation_memory[conversation_id] = _conversation_memory[conversation_id][-(_WINDOW_SIZE):]


def get_conversation_memory_context(
    conversation_id: str,
    user_id: str,
) -> str | None:
    """
    Get the conversation memory context for a given conversation.
    Returns a formatted string with the last 4 message turns.
    
    This is a synchronous function that reads from the in-memory store.
    No DB calls - much faster than summary-based memory.
    
    Returns None if no conversation memory exists.
    """
    with _memory_lock:
        turns = _conversation_memory.get(conversation_id, [])
    
    if not turns:
        return None
    
    # Format as simple conversation history
    formatted_turns = []
    for i, (user_msg, assistant_msg) in enumerate(turns, 1):
        formatted_turns.append(f"Turn {i}:\nUser: {user_msg}\nAssistant: {assistant_msg}")
    
    history_str = "\n\n".join(formatted_turns)
    
    print(
        f"[memory_service] Window memory: {len(turns)} turns "
        f"for conversation {conversation_id}"
    )
    
    return history_str


async def get_conversation_memory_context_async(
    conversation_id: str,
    user_id: str,
) -> str | None:
    """
    Async wrapper for get_conversation_memory_context.
    For compatibility with existing async code.
    """
    return get_conversation_memory_context(conversation_id, user_id)


def clear_conversation_memory(conversation_id: str) -> None:
    """
    Clear memory for a specific conversation.
    Called when a conversation is deleted.
    """
    global _conversation_memory
    
    with _memory_lock:
        if conversation_id in _conversation_memory:
            del _conversation_memory[conversation_id]


def get_all_conversations() -> List[str]:
    """
    Get list of all conversation IDs currently in memory.
    """
    with _memory_lock:
        return list(_conversation_memory.keys())


def format_memory_block(memory_context: str) -> str:
    """
    Wrap the memory context string in a clear delimiter block
    that explicitly instructs the agent to treat this as background context only.
    """
    return (
        "\n--- RECENT CONVERSATION CONTEXT ---\n"
        "[SYSTEM INSTRUCTION: The following is the recent conversation history. "
        "Use this as context for the current query.]\n\n"
        f"{memory_context}\n"
        "--- END OF CONTEXT ---\n\n"
    )