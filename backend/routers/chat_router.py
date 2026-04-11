import json
import logging
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from core import get_current_user

from schemas import (
    QueryRequest,
    TaskRequest,
    SmartOrchestratorRequest
)

from services import (
    run_tool_agent,
    run_tool_agent_stream_sse,
    smart_orchestrator_stream,
    get_conversation_memory_context_async,
    run_orchestrator_stream_with_state,
    _to_non_empty_text,
    add_to_memory
)

from repositories import (
    create_conversation,
    append_message,
    update_conversation_timestamp,
    log_chunk_retrieval,
    log_detected_mistakes,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])


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


@router.post("/smart-orchestrator/stream")
async def smart_orchestrator_endpoint(
    req: SmartOrchestratorRequest, user_id: str = Depends(get_current_user)
):
    """Smart orchestrator SSE stream (routes to standard/deep_research/code)."""
    final_result = ""
    meta_info = {}
    detected_path = "standard"
    pre_thinking = {"decomposition": "", "researcher1": "", "researcher2": ""}
    deep_research_aggregation = ""
    code_pre_thinking = {
        "problem_understanding": "",
        "approach": "",
        "agent_outputs": [],
        "file_outputs": [],
    }
    code_final_marker = None

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

    def _extract_code_complete_marker(value):
        parsed_result = None
        if isinstance(value, str) and value.strip():
            try:
                parsed_result = json.loads(value)
            except json.JSONDecodeError:
                parsed_result = None
        elif isinstance(value, dict):
            parsed_result = value

        if isinstance(parsed_result, dict) and parsed_result.get("type") == "code_complete":
            return parsed_result
        return None

    def _build_code_approach_from_subtasks(subtasks) -> str:
        if not isinstance(subtasks, list):
            return ""
        lines = []
        for subtask in subtasks:
            if not isinstance(subtask, dict):
                continue
            desc = str(subtask.get("description", "")).strip()
            if not desc:
                continue
            subtask_id = subtask.get("id")
            if subtask_id is not None:
                lines.append(f"- Agent {subtask_id}: {desc}")
            else:
                lines.append(f"- {desc}")
        if not lines:
            return ""
        return "Parallel implementation plan:\n" + "\n".join(lines)

    def _build_code_assistant_content(
        problem_understanding: str,
        approach: str,
        final_marker: dict | None,
    ) -> str:
        sections = []
        if problem_understanding:
            sections.append(f"Problem Understanding:\n{problem_understanding}")
        if approach:
            sections.append(f"Approach:\n{approach}")
        summary = "\n\n".join(sections).strip()
        if summary:
            return summary

        if isinstance(final_marker, dict):
            file_count = final_marker.get("file_count")
            filenames = final_marker.get("filenames", [])
            if isinstance(file_count, int):
                if isinstance(filenames, list) and filenames:
                    return (
                        f"Code generation completed with {file_count} file(s): "
                        + ", ".join(str(name) for name in filenames)
                    )
                return f"Code generation completed with {file_count} file(s)."
        return ""

    async def event_generator():
        nonlocal final_result, meta_info, detected_path, pre_thinking, deep_research_aggregation, code_pre_thinking, code_final_marker
        try:
            async for chunk in smart_orchestrator_stream(
                req.task,
                conversation_id=req.conversation_id,
                user_id=user_id,
            ):
                try:
                    if chunk.startswith("data: "):
                        evt = json.loads(chunk[6:].strip())
                        evt_type = evt.get("type")
                        if evt_type == "final":
                            final_result = evt.get("result", "")
                            meta_info = evt.get("meta", {})
                            if detected_path == "code":
                                parsed_result = _extract_code_complete_marker(final_result)
                                if isinstance(parsed_result, dict):
                                    code_final_marker = parsed_result
                        elif evt_type == "route":
                            detected_path = evt.get("path", "standard")
                        elif evt_type == "content_chunk":
                            section = evt.get("section", "")
                            content = evt.get("content", "")
                            if section == "decomposition":
                                pre_thinking["decomposition"] = content
                            elif section == "researcher_1":
                                pre_thinking["researcher1"] = content
                            elif section == "researcher_2":
                                pre_thinking["researcher2"] = content
                            elif section == "aggregation":
                                deep_research_aggregation = content
                        elif evt_type == "code_section":
                            section = evt.get("section", "")
                            content = evt.get("content", "")
                            if section == "problem_understanding":
                                code_pre_thinking["problem_understanding"] = content
                            elif section == "approach":
                                code_pre_thinking["approach"] = content
                        elif evt_type == "plan" and detected_path == "code":
                            if not code_pre_thinking.get("approach"):
                                generated_approach = _build_code_approach_from_subtasks(
                                    evt.get("subtasks", [])
                                )
                                if generated_approach:
                                    code_pre_thinking["approach"] = generated_approach
                        elif evt_type == "agent_output" and detected_path == "code":
                            code_pre_thinking["agent_outputs"].append(
                                {
                                    "agent_id": evt.get("agent_id"),
                                    "agent_name": evt.get("agent_name"),
                                    "content": evt.get("content", ""),
                                }
                            )
                        elif evt_type == "file_output" and detected_path == "code":
                            code_pre_thinking["file_outputs"].append(
                                {
                                    "filename": evt.get("filename", ""),
                                    "language": evt.get("language", "text"),
                                    "index": evt.get("index"),
                                    "total": evt.get("total"),
                                    "content": evt.get("content", ""),
                                }
                            )
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
                orchestrator_raw = meta_info.get("orchestrator_raw", {})
                orchestrator_raw_result = (
                    _to_non_empty_text(orchestrator_raw.get("final_result", ""))
                    if isinstance(orchestrator_raw, dict)
                    else ""
                )
                path_specific_final_result = _to_non_empty_text(final_result)
                deep_research_chunk_content = _to_non_empty_text(deep_research_aggregation)
                code_summary_content = ""
                pre_thinking_data = None

                if detected_path == "deep_research":
                    pre_thinking_data = (
                        pre_thinking if pre_thinking.get("decomposition") else None
                    )
                elif detected_path == "code":
                    parsed_result = _extract_code_complete_marker(final_result)
                    if code_final_marker is None and isinstance(parsed_result, dict):
                        code_final_marker = parsed_result
                    if isinstance(parsed_result, dict):
                        path_specific_final_result = ""

                    problem_understanding = str(
                        code_pre_thinking.get("problem_understanding", "")
                    ).strip()
                    approach = str(code_pre_thinking.get("approach", "")).strip()
                    agent_outputs = code_pre_thinking.get("agent_outputs", [])
                    file_outputs = code_pre_thinking.get("file_outputs", [])

                    code_summary_content = _build_code_assistant_content(
                        problem_understanding,
                        approach,
                        code_final_marker
                        if isinstance(code_final_marker, dict)
                        else None,
                    )

                    pre_thinking_data = {
                        "route_path": detected_path,
                        "agent_outputs": agent_outputs,
                        "file_outputs": file_outputs,
                    }
                    if isinstance(code_final_marker, dict):
                        pre_thinking_data["final_marker"] = code_final_marker

                    if not (
                        pre_thinking_data["agent_outputs"]
                        or pre_thinking_data["file_outputs"]
                        or pre_thinking_data.get("final_marker")
                    ):
                        pre_thinking_data = None

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

                explicit_fallback_text = (
                    "Deep research completed."
                    if detected_path == "deep_research"
                    else "Code generation completed."
                    if detected_path == "code"
                    else "Request completed."
                )

                assistant_content_to_store = (
                    path_specific_final_result
                    or orchestrator_raw_result
                    or deep_research_chunk_content
                    or code_summary_content
                    or explicit_fallback_text
                )

                message_id = await append_message(
                    conversation_id=conv_id,
                    reasoning_mode=reasoning,
                    user_content=req.task,
                    assistant_content=assistant_content_to_store,
                    confidence=raw_conf / 100 if raw_conf is not None else None,
                    consistency=raw_cons / 100 if raw_cons is not None else None,
                    pdfs=req.pdfs,
                    pre_thinking=pre_thinking_data,
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
                    add_to_memory(conv_id, req.task, assistant_content_to_store)
                    
            except Exception as db_err:
                print(f"[chat_router] DB persist error: {db_err}")

            yield 'data: {"type": "done"}\n\n'

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
