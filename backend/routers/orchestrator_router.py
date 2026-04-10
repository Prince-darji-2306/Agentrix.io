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


def _to_non_empty_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (dict, list)):
        try:
            return json.dumps(value, ensure_ascii=False).strip()
        except Exception:
            return str(value).strip()
    return str(value).strip()


@router.post("/orchestrator/task")
async def orchestrator_task(req: TaskRequest, user_id: str = Depends(get_current_user)):
    """Run the multi-agent orchestrator (deep research) with SSE streaming."""

    async def event_generator():
        final_result = ""
        final_meta = {}
        conv_id = req.conversation_id
        pre_thinking = {"decomposition": "", "researcher1": "", "researcher2": ""}
        aggregation_content = ""

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
                        pre_thinking["decomposition"] = content
                    elif section == "researcher_1":
                        pre_thinking["researcher1"] = content
                    elif section == "researcher_2":
                        pre_thinking["researcher2"] = content
                    elif section == "aggregation":
                        aggregation_content = content

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

            assistant_content_to_store = (
                _to_non_empty_text(final_result)
                or (
                    _to_non_empty_text(orchestrator_raw.get("final_result", ""))
                    if isinstance(orchestrator_raw, dict)
                    else ""
                )
                or _to_non_empty_text(aggregation_content)
                or "Deep research completed."
            )

            # Only save pre_thinking if we have decomposition content
            pre_thinking_data = (
                pre_thinking if pre_thinking.get("decomposition") else None
            )

            await append_message(
                conversation_id=conv_id,
                reasoning_mode="deep_research",
                user_content=req.task,
                assistant_content=assistant_content_to_store,
                confidence=raw_conf / 100 if raw_conf is not None else None,
                consistency=raw_cons / 100 if raw_cons is not None else None,
                pre_thinking=pre_thinking_data,
                tools=tools,
            )
            await update_conversation_timestamp(conv_id)

            # Emit conversation_id to frontend
            yield f"data: {json.dumps({'type': 'conversation_id', 'conversation_id': conv_id})}\n\n"

            # Update window memory
            if conv_id:
                add_to_memory(conv_id, req.task, assistant_content_to_store)

        except Exception as db_err:
            logger.error(f"[orchestrator_router] DB persist error: {db_err}", exc_info=True)

        yield 'data: {"type": "done"}\n\n'

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
