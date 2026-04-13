"""
Context injection utilities for memory and history management.

Provides consistent patterns for:
- Checking if memory/context is available
- Logging context injection
- Formatting and prepending context to tasks/prompts
- Context size tracking for monitoring

Single source of truth for memory injection patterns used across all services.
"""

import logging
from services.memory_service import format_memory_block

logger = logging.getLogger(__name__)


def inject_memory_context(
    primary_content: str,
    memory_context: str | None = None,
    service_name: str = "agent",
    context_type: str = "memory",
) -> str:
    """
    Inject memory/context into primary content with consistent logging.
    
    Args:
        primary_content: Main content (task, query, prompt)
        memory_context: Optional prior history/context to prepend
        service_name: Name of calling service for logging (e.g., "agent_service", "orchestrator")
        context_type: Type of context for logging clarity (e.g., "memory", "history", "prior_conversation")
        
    Returns:
        Combined content with memory prepended if available, otherwise primary_content as-is
        
    Example:
        effective_task = inject_memory_context(
            primary_content=task,
            memory_context=user_history,
            service_name="coding_service",
            context_type="conversation"
        )
    """
    if memory_context:
        logger.info(
            f"[{service_name}] Injecting {context_type} context ({len(memory_context)} chars) into task."
        )
        return format_memory_block(memory_context) + primary_content
    else:
        logger.info(
            f"[{service_name}] No {context_type} context available — proceeding without prior history."
        )
        return primary_content


def has_memory_context(memory_context: str | None) -> bool:
    """
    Check if memory context is available (non-None and non-empty).
    
    Args:
        memory_context: Potential context string
        
    Returns:
        True if context exists and is non-empty, False otherwise
    """
    return bool(memory_context and memory_context.strip())


def log_context_injection(
    service_name: str,
    context_size: int | None = None,
    context_type: str = "memory",
    action: str = "injecting",
) -> None:
    """
    Log context injection with standardized format.
    
    Args:
        service_name: Name of calling service
        context_size: Optional size in bytes/chars for monitoring
        context_type: Type of context (memory, history, etc.)
        action: Action being taken (injecting, skipping, loading, etc.)
        
    Example:
        log_context_injection("orchestrator_service", 245, "conversation", "injecting")
        # Output: [orchestrator_service] Injecting 245 chars of conversation context
    """
    if context_size:
        logger.info(
            f"[{service_name}] {action.capitalize()} {context_size} chars of {context_type} context"
        )
    else:
        logger.info(f"[{service_name}] {action.capitalize()} {context_type} context")
