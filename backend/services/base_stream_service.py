"""
Base streaming service with shared SSE (Server-Sent Events) utilities.

Provides consistent patterns for:
- SSE event formatting
- Event yielding and streaming
- Error handling in streams
- Event queue management

Single source of truth for server-sent event generation across all services.
"""

import json
from typing import Any, AsyncGenerator, Callable


def format_sse_event(data: dict[str, Any]) -> str:
    """
    Format a dict as SSE (Server-Sent Events) message.
    
    Args:
        data: Dict to serialize as JSON event
        
    Returns:
        SSE-formatted string: "data: {json}\n\n"
        
    Example:
        event = {"type": "token", "content": "hello"}
        sse_message = format_sse_event(event)
        # Returns: 'data: {"type": "token", "content": "hello"}\n\n'
    """
    return f"data: {json.dumps(data)}\n\n"


async def yield_sse_events(
    event_source: AsyncGenerator[dict[str, Any], None],
) -> AsyncGenerator[str, None]:
    """
    Convert dict events to SSE format.
    
    Args:
        event_source: Async generator yielding event dicts
        
    Yields:
        SSE-formatted event strings
        
    Example:
        async def my_events():
            yield {"type": "start"}
            yield {"type": "token", "content": "hello"}
            yield {"type": "done"}
        
        async for sse_msg in yield_sse_events(my_events()):
            await send(sse_msg)
    """
    try:
        async for event in event_source:
            yield format_sse_event(event)
    except Exception as exc:
        yield format_sse_event({
            "type": "error",
            "message": str(exc),
        })


async def yield_sse_with_error_handling(
    event_source: AsyncGenerator[dict[str, Any], None],
    error_logger: Callable[[str], None] | None = None,
) -> AsyncGenerator[str, None]:
    """
    Convert dict events to SSE format with error handling and logging.
    
    Args:
        event_source: Async generator yielding event dicts
        error_logger: Optional callback to log errors
        
    Yields:
        SSE-formatted event strings
    """
    try:
        async for event in event_source:
            yield format_sse_event(event)
    except Exception as exc:
        error_msg = str(exc)
        if error_logger:
            error_logger(f"SSE stream error: {error_msg}")
        yield format_sse_event({
            "type": "error",
            "message": error_msg,
        })


def create_sse_event(
    event_type: str,
    **kwargs: Any,
) -> dict[str, Any]:
    """
    Create a properly-structured SSE event dict.
    
    Args:
        event_type: Type of event (e.g., "token", "done", "error")
        **kwargs: Additional fields to include
        
    Returns:
        Dict ready to be formatted as SSE
        
    Example:
        event = create_sse_event("token", content="hello", phase="initial")
        sse_msg = format_sse_event(event)
    """
    return {"type": event_type, **kwargs}
