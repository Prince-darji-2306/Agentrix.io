import json
import logging
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from core import get_current_user
from services import run_orchestrator_stream_with_state
from services.memory_service import get_conversation_memory_context_async, add_to_memory
from repositories import create_conversation, append_message, update_conversation_timestamp

logger = logging.getLogger(__name__)

router = APIRouter(tags=["orchestrator"])


class TaskRequest(BaseModel):
    task: str
    conversation_id: str | None = None


@router.post("/orchestrator/task")
async def orchestrator_task(req: TaskRequest, user_id: str = Depends(get_current_user)):
    """Run the multi-agent orchestrator (deep research) with SSE streaming."""

    async def event_generator():
        final_result = ""
        final_meta = {}
        conv_id = req.conversation_id
        what_happened = {"decomposition": "", "researcher1": "", "researcher2": ""}

        try:
            # Load memory context
            memory_context: str | None = None
            if req.conversation_id:
                memory_context = await get_conversation_memory_context_async(req.conversation_id, user_id)

            # Stream orchestrator events
            async for event in run_orchestrator_stream_with_state(req.task, memory_context=memory_context):
                event_type = event.get("type", "")

                # Forward all events to frontend
                yield f"data: {json.dumps(event)}\n\n"

                # Capture final result for DB persistence
                if event_type == "final":
                    final_result = event.get("result", "")
                    final_meta = event.get("meta", {})
                elif event_type == "content_chunk":
                    section = event.get("section", "")
                    content = event.get("content", "")
                    if section == "decomposition":
                        what_happened["decomposition"] = content
                    elif section == "researcher_1":
                        what_happened["researcher1"] = content
                    elif section == "researcher_2":
                        what_happened["researcher2"] = content

        except Exception as e:
            logger.error(f"[orchestrator_router] Streaming error: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        # Persist to DB after streaming completes
        try:
            if not conv_id:
                conv_id = await create_conversation(user_id, "standard", req.task[:200])

            raw_conf = final_meta.get("confidence_score")
            raw_cons = final_meta.get("logical_consistency")
            orchestrator_raw = final_meta.get("orchestrator_raw", {})
            tools = final_meta.get("tools_used", [])

            # Only save what_happened if we have decomposition content
            wh_data = what_happened if what_happened.get("decomposition") else None

            await append_message(
                conversation_id=conv_id,
                reasoning_mode="deep_research",
                user_content=req.task,
                assistant_content=final_result,
                confidence=raw_conf / 100 if raw_conf is not None else None,
                consistency=raw_cons / 100 if raw_cons is not None else None,
                what_happened=wh_data,
                tools=tools,
            )
            await update_conversation_timestamp(conv_id)

            # Emit conversation_id to frontend
            yield f"data: {json.dumps({'type': 'conversation_id', 'conversation_id': conv_id})}\n\n"

            # Update window memory
            if conv_id:
                add_to_memory(conv_id, req.task, final_result)

        except Exception as db_err:
            logger.error(f"[orchestrator_router] DB persist error: {db_err}", exc_info=True)

        yield 'data: {"type": "done"}\n\n'

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
