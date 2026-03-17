import json
# from api import pages
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from convo import run_tool_agent
from debater import run_debate_stream
from orchestrator import run_orchestrator
from schemas.schema import QueryRequest, TaskRequest
from utils.pdf_processor import process_pdfs

from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AI Agents Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# app.include_router(pages.router)

# ─── Route 1: Tool-Calling Agent (LangGraph) ─────────────────────────────────
@app.post("/chat")
async def agent_query(req: QueryRequest):
    try:
        result = await run_tool_agent(req.query)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── Route 2a: Orchestrator Multi-Agent (LangGraph) – JSON ───────────────────
@app.post("/orchestrator/task")
async def orchestrator_task(req: TaskRequest):
    try:
        result = await run_orchestrator(req.task)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── Route 2b: Orchestrator Multi-Agent – SSE Stream ─────────────────────────
@app.post("/orchestrator/stream")
async def orchestrator_stream(req: TaskRequest):
    """Streaming version of orchestrator that emits SSE events as each agent completes."""
    async def event_generator():
        try:
            from orchestrator import (
                orchestrator_node, worker_node, aggregator_node,
                OrchestratorState
            )
            import asyncio

            state: OrchestratorState = {
                "original_task": req.task,
                "subtasks": [],
                "current_subtask_index": 0,
                "final_result": "",
                "step_logs": [],
            }

            # Step 1: orchestrator decomposes task
            yield f"data: {json.dumps({'type': 'log', 'message': '🎯 Decomposing task into subtasks…'})}\n\n"
            state = {**state, **orchestrator_node(state)}

            for log in state.get("step_logs", []):
                yield f"data: {json.dumps({'type': 'log', 'message': log})}\n\n"

            # Emit subtask plan
            yield f"data: {json.dumps({'type': 'plan', 'subtasks': [{'id': s['id'], 'description': s['description'], 'agent_type': s['agent_type']} for s in state['subtasks']]})}\n\n"

            # Step 2: run workers
            total = len(state["subtasks"])
            for i in range(total):
                state = {**state, **worker_node(state)}
                logs = state.get("step_logs", [])
                last_log = logs[-1] if logs else ""
                st = state["subtasks"][i]
                yield f"data: {json.dumps({'type': 'agent_result', 'agent_type': st['agent_type'], 'description': st['description'], 'result': st.get('result', ''), 'log': last_log})}\n\n"
                await asyncio.sleep(0.05)

            # Step 3: aggregate
            yield f"data: {json.dumps({'type': 'log', 'message': '🔗 Synthesizing all results…'})}\n\n"
            state = {**state, **aggregator_node(state)}

            yield f"data: {json.dumps({'type': 'final', 'result': state['final_result'], 'step_logs': state.get('step_logs', [])})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# ─── Route 3: Debate (Groq) – SSE Stream ──────────────────────────────────────
@app.get("/debate/stream")
async def debate_stream(topic: str, rounds: int = 3):
    async def event_generator():
        async for msg in run_debate_stream(topic, rounds):
            yield f"data: {json.dumps(msg)}\n\n"
        yield "data: {\"type\": \"done\"}\n\n"
    return StreamingResponse(event_generator(), media_type="text/event-stream")

# ─── Route 4: PDF Upload & Processing ─────────────────────────────────────────
@app.post("/upload-pdf")
async def upload_pdfs(
    files: list[UploadFile] = File(...),
    user_id: str = "default_user"
):
    """
    Accepts multiple PDF files, saves them temporarily,
    processes them through pdf_processor, and stores extracted text in ChromaDB.
    """
    import tempfile
    import shutil
    import os
    import asyncio

    temp_dir = tempfile.mkdtemp()
    file_paths = []

    try:
        # Save uploaded files to temporary directory
        for file in files:
            if not file.filename:
                continue
            temp_path = os.path.join(temp_dir, file.filename)
            with open(temp_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            file_paths.append(temp_path)

        # Process PDFs in a thread to avoid blocking the event loop
        # pdf_processor itself uses ThreadPoolExecutor for parallel processing
        results = await asyncio.to_thread(process_pdfs, file_paths, user_id)

        return {
            "status": "success",
            "processed": results.get("total_chunks", 0),
            "details": results
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Clean up temporary files
        shutil.rmtree(temp_dir, ignore_errors=True)

# ─── Serve Frontend HTML Files ────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
