import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from core import get_current_user

from services import (
    run_debate_stream,
    structure_debate_rounds
)
from repositories import (
    create_conversation,
    create_debate_session,
    get_debate_session_by_conversation_id,
    update_conversation_timestamp
)

router = APIRouter(tags=["debate"])


@router.get("/debate/stream")
async def debate_stream(topic: str, rounds: int = 3, user_id: str = Depends(get_current_user)):
    """Stream a debate between two agents via SSE."""
    debate_events = []

    async def event_generator():
        nonlocal debate_events
        async for msg in run_debate_stream(topic, rounds):
            debate_events.append(msg)
            yield f"data: {json.dumps(msg)}\n\n"

        # Persist debate session after all rounds complete
        try:
            conv_id = await create_conversation(user_id, "debate", topic[:200])
            
            structured_rounds = structure_debate_rounds(debate_events)

            verdict_text = None
            for msg in debate_events:
                if msg.get("type") == "verdict":
                    verdict_text = msg.get("content", "")

            await create_debate_session(
                user_id=user_id,
                conversation_id=conv_id,
                topic=topic,
                debate_messages=structured_rounds,
                verdict_text=verdict_text,
            )
            await update_conversation_timestamp(conv_id)
            
            # Emit conversation_id for this debate session
            yield f"data: {json.dumps({'type': 'conversation_id', 'conversation_id': conv_id})}\n\n"
        except Exception as db_err:
            print(f"[debate_router] DB persist error: {db_err}")

        yield "data: {\"type\": \"done\"}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/debate/session/{conversation_id}")
async def get_debate_session(conversation_id: str, user_id: str = Depends(get_current_user)):
    """Return a saved debate session for history replay."""
    session = await get_debate_session_by_conversation_id(conversation_id, user_id)
    if not session:
        return {"session": None}
    return {"session": session}
