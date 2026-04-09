import json
import logging
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from core import get_current_user
from services import (
    run_tool_agent,
    run_tool_agent_stream_sse,
    smart_orchestrator_stream,
    run_smart_chat,
    get_conversation_memory_context_async,
)
from services.memory_service import add_to_memory, clear_conversation_memory
from repositories import (
    create_conversation,
    append_message,
    update_conversation_timestamp,
    log_chunk_retrieval,
    log_detected_mistakes,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])


class QueryRequest(BaseModel):
    query: str
    conversation_id: str | None = None
    pdfs: list[str] | None = None


class SmartOrchestratorRequest(BaseModel):
    task: str
    conversation_id: str | None = None
    pdfs: list[str] | None = None


@router.post("/chat")
async def agent_query(req: QueryRequest, user_id: str = Depends(get_current_user)):
    """
    Standard chat endpoint.

    Flow:
    1. run_tool_agent  → answers the query; chunks retrieved are buffered internally
    2. append_message  → persists the turn to DB, returns the real messages.id
    3. log_chunk_retrieval → writes each buffered chunk with the correct message_id FK
    """
    try:
        # ── Fetch prior conversation memory (if this is a continuing conversation) ─
        memory_context: str | None = None
        if req.conversation_id:
            print(f"[chat_router] Fetching memory for conv_id={req.conversation_id}")
            memory_context = await get_conversation_memory_context_async(
                req.conversation_id, user_id
            )
            if memory_context:
                print(
                    f"[chat_router] Memory context ready: {len(memory_context)} chars"
                )
            else:
                print(
                    f"[chat_router] No prior memory found for conv_id={req.conversation_id}"
                )

        # ── Run tool agent with optional memory context ─────────────────────
        result = await run_tool_agent(
            req.query, user_id=user_id, pdfs=req.pdfs, memory_context=memory_context
        )

        # ── Step 3 & 4: Persist message, then log chunks with real message_id ──
        try:
            conv_id = req.conversation_id
            if not conv_id:
                conv_id = await create_conversation(
                    user_id, "standard", req.query[:200]
                )

            # append_message returns the UUID of the newly inserted messages row
            message_id = await append_message(
                conversation_id=conv_id,
                reasoning_mode="standard",
                user_content=req.query,
                assistant_content=result.get("answer", ""),
                pdfs=req.pdfs,
            )
            await update_conversation_timestamp(conv_id)

            # Log every retrieved chunk with the real messages.id FK
            for chunk in result.get("retrieved_chunks", []):
                try:
                    await log_chunk_retrieval(
                        message_id=message_id,
                        qdrant_chunk_id=chunk.get("id", ""),
                        pdf_id=chunk.get("pdf_id", ""),
                        similarity_score=chunk.get("similarity_score", 0.0),
                        quality_score=None,
                    )
                except Exception as log_err:
                    print(
                        f"[chat_router] Chunk log failed for {chunk.get('id')}: {log_err}"
                    )

        except Exception as db_err:
            print(f"[chat_router] DB persist error: {db_err}")
            conv_id = req.conversation_id  # best effort

        # ── Update window memory ─────────────────────────────
        if conv_id:
            add_to_memory(conv_id, req.query, result.get("answer", ""))

        return {"result": result, "conversation_id": conv_id}
    except Exception as e:
        logger.error(f"[chat_router] /chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/stream")
async def agent_query_stream(
    req: QueryRequest, user_id: str = Depends(get_current_user)
):
    """
    Standard chat endpoint with SSE streaming (3-phase: initial → tools → final).

    Flow:
      1. Load memory context (if conversation_id provided)
      2. Stream tool agent execution via SSE
      3. Persist message + chunk logs after streaming completes
    """
    logger.info(
        f"[chat_router:stream] Request from user={user_id}, conv_id={req.conversation_id}"
    )

    # ── Fetch prior conversation memory ─
    memory_context: str | None = None
    if req.conversation_id:
        logger.info(
            f"[chat_router:stream] Fetching memory for conv_id={req.conversation_id}"
        )
        memory_context = await get_conversation_memory_context_async(
            req.conversation_id, user_id
        )
        if memory_context:
            logger.info(
                f"[chat_router:stream] Memory context ready: {len(memory_context)} chars"
            )
        else:
            logger.info(
                f"[chat_router:stream] No prior memory found for conv_id={req.conversation_id}"
            )

    async def event_generator():
        final_answer = ""
        tools_used = []
        retrieved_chunks = []

        try:
            # Stream the tool agent execution
            async for sse_line in run_tool_agent_stream_sse(
                query=req.query,
                user_id=user_id,
                pdfs=req.pdfs,
                memory_context=memory_context,
            ):
                # Parse to capture final data for DB persistence
                try:
                    if sse_line.startswith("data: "):
                        evt = json.loads(sse_line[6:].strip())
                        if evt.get("type") == "done":
                            final_answer = evt.get("answer", "")
                            tools_used = evt.get("tools_used", [])
                            retrieved_chunks = evt.get("retrieved_chunks", [])
                        elif evt.get("type") == "error":
                            logger.error(
                                f"[chat_router:stream] Stream error: {evt.get('message')}"
                            )
                except (json.JSONDecodeError, IndexError):
                    pass
                yield sse_line

        except Exception as e:
            logger.error(f"[chat_router:stream] Streaming error: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        # ── Persist to DB after streaming ─
        try:
            conv_id = req.conversation_id
            if not conv_id:
                conv_id = await create_conversation(
                    user_id, "standard", req.query[:200]
                )
                logger.info(f"[chat_router:stream] Created new conversation: {conv_id}")

            message_id = await append_message(
                conversation_id=conv_id,
                reasoning_mode="standard",
                user_content=req.query,
                assistant_content=final_answer,
                pdfs=req.pdfs,
            )
            await update_conversation_timestamp(conv_id)
            logger.info(
                f"[chat_router:stream] Persisted message {message_id} to conv {conv_id}"
            )

            # Log retrieved chunks
            for chunk in retrieved_chunks:
                try:
                    await log_chunk_retrieval(
                        message_id=message_id,
                        qdrant_chunk_id=chunk.get("id", ""),
                        pdf_id=chunk.get("pdf_id", ""),
                        similarity_score=chunk.get("similarity_score", 0.0),
                        quality_score=None,
                    )
                except Exception as log_err:
                    logger.warning(
                        f"[chat_router:stream] Chunk log failed for {chunk.get('id')}: {log_err}"
                    )

            # Emit conversation_id to frontend
            yield f"data: {json.dumps({'type': 'conversation_id', 'conversation_id': conv_id})}\n\n"

            # ── Update window memory ─────────────────────────────
            if conv_id:
                add_to_memory(conv_id, req.query, final_answer)

        except Exception as db_err:
            logger.error(
                f"[chat_router:stream] DB persist error: {db_err}", exc_info=True
            )

        yield 'data: {"type": "done"}\n\n'

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/smart-orchestrator/stream")
async def smart_orchestrator_endpoint(
    req: SmartOrchestratorRequest, user_id: str = Depends(get_current_user)
):
    """Smart orchestrator SSE stream (routes to standard/deep_research/code)."""
    final_result = ""
    meta_info = {}
    detected_path = "standard"
    what_happened = {"decomposition": "", "researcher1": "", "researcher2": ""}

    async def event_generator():
        nonlocal final_result, meta_info, detected_path, what_happened
        try:
            async for chunk in smart_orchestrator_stream(
                req.task,
                conversation_id=req.conversation_id,
                user_id=user_id,
            ):
                try:
                    if chunk.startswith("data: "):
                        evt = json.loads(chunk[6:].strip())
                        if evt.get("type") == "final":
                            final_result = evt.get("result", "")
                            meta_info = evt.get("meta", {})
                        elif evt.get("type") == "route":
                            detected_path = evt.get("path", "standard")
                        elif evt.get("type") == "content_chunk":
                            section = evt.get("section", "")
                            content = evt.get("content", "")
                            if section == "decomposition":
                                what_happened["decomposition"] = content
                            elif section == "researcher_1":
                                what_happened["researcher1"] = content
                            elif section == "researcher_2":
                                what_happened["researcher2"] = content
                except (json.JSONDecodeError, IndexError):
                    pass
                yield chunk
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            try:
                reasoning = (
                    "multi_agent"
                    if detected_path in ("deep_research", "code")
                    else "multi_agent"
                )

                conv_id = req.conversation_id
                if not conv_id:
                    conv_id = await create_conversation(
                        user_id, "standard", req.task[:200]
                    )

                raw_conf = meta_info.get("confidence_score")
                raw_cons = meta_info.get("logical_consistency")
                serious_mistakes = meta_info.get("serious_mistakes", [])

                # Use orchestrator_raw final_result as fallback if final_result is empty
                if not final_result:
                    orchestrator_raw = meta_info.get("orchestrator_raw", {})
                    if orchestrator_raw:
                        final_result = orchestrator_raw.get("final_result", "")

                # Only save what_happened if we have decomposition content
                wh_data = what_happened if what_happened.get("decomposition") else None

                # Build tools list based on detected path
                tools = None
                if detected_path == "deep_research":
                    tools = ["Researcher_Agent1", "Researcher_Agent2", "Aggregator_Agent"]
                elif detected_path == "code":
                    tools = ["Code_Planner", "Coder_1", "Coder_2", "Coder_3", "Aggregator", "Reviewer"]
                else:
                    # Standard mode - use tools from meta
                    tools = meta_info.get("tools_used", [])
                    if tools:
                        tools = [t if isinstance(t, str) else t.get("tool", str(t)) for t in tools]

                message_id = await append_message(
                    conversation_id=conv_id,
                    reasoning_mode=reasoning,
                    user_content=req.task,
                    assistant_content=final_result,
                    confidence=raw_conf / 100 if raw_conf is not None else None,
                    consistency=raw_cons / 100 if raw_cons is not None else None,
                    pdfs=req.pdfs,
                    what_happened=wh_data,
                    tools=tools,
                )
                await update_conversation_timestamp(conv_id)

                if serious_mistakes:
                    try:
                        await log_detected_mistakes(
                            message_id, user_id, serious_mistakes
                        )
                    except Exception as log_err:
                        print(f"[chat_router] Mistake log error: {log_err}")

                # Emit the final conversation_id to the frontend
                yield f"data: {json.dumps({'type': 'conversation_id', 'conversation_id': conv_id})}\n\n"
                
                # ── Update window memory ─────────────────────────────
                if conv_id:
                    add_to_memory(conv_id, req.task, final_result)
                    
            except Exception as db_err:
                print(f"[chat_router] DB persist error: {db_err}")

            yield 'data: {"type": "done"}\n\n'

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
