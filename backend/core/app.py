from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.exceptions import register_exception_handlers
from repositories import init_db, close_pool, init_qdrant_collections
from routers.auth_router import router as auth_router
from routers.chat_router import router as chat_router
from routers.history_router import router as history_router
from routers.pdf_router import router as pdf_router
from routers.debate_router import router as debate_router
from routers.orchestrator_router import router as orchestrator_router
from routers.admin_router import router as admin_router



app = FastAPI(title="AI Agents Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register global exception handlers
register_exception_handlers(app)

# Include all routers
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(history_router)
app.include_router(pdf_router)
app.include_router(debate_router)
app.include_router(orchestrator_router)
app.include_router(admin_router)


# ─── Startup / Shutdown Events ────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    """Initialize database and Qdrant collections on server start."""
    await init_db()
    await close_pool()
    try:
        init_qdrant_collections()
        print("[app] Qdrant collections initialized.")
    except Exception as e:
        print(f"[app] Qdrant initialization skipped (unavailable): {e}")
    print("[app] Server started successfully.")


@app.on_event("shutdown")
async def shutdown():
    """Close database pool on shutdown."""
    await close_pool()
    print("[app] Server shut down.")


# ─── Root ──────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    """Root endpoint - API landing page"""
    return {
        "service": "Agentrix.io API",
        "status": "operational",
        "version": "2.6.0",
        "endpoints": {
            "auth_register": "/auth/register (POST)",
            "auth_login": "/auth/login (POST)",
            "chat": "/chat (POST)",
            "orchestrator": "/orchestrator/task (POST)",
            "smart_orchestrator": "/smart-orchestrator/stream (POST)",
            "debate": "/debate/stream (GET)",
            "upload": "/upload-pdf (POST)",
            "memory_pdfs": "/memory/pdfs (GET)",
            "history": "/history (GET)",
            "docs": "/docs",
            "redoc": "/redoc",
        },
    }
