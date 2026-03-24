import os
import json
import shutil
import asyncio
import tempfile

from fastapi import FastAPI, HTTPException, UploadFile, File
from orchestrator import aggregator_node, OrchestratorState
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from convo import run_tool_agent
from debater import run_debate_stream
from orchestrator import run_orchestrator
from schemas.schema import QueryRequest, TaskRequest, CodeModeState
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


@app.get("/")
async def root():
    """Root endpoint - API landing page"""
    return {
        "service": "Agentrix.io API",
        "status": "operational",
        "version": "2.4.1",
        "endpoints": {
            "chat": "/chat (POST)",
            "orchestrator": "/orchestrator/task (POST)",
            "debate": "/debate/stream (GET)",
            "upload": "/upload-pdf (POST)",
            "docs": "/docs",
            "redoc": "/redoc"
        }
    }

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
