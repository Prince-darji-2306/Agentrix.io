from fastapi import APIRouter, HTTPException, Query
from repositories import get_pool

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/tables")
async def list_tables():
    """List all tables and their row counts."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        tables = [
            "users",
            "conversations",
            "messages",
            "debate_sessions",
            "detected_mistakes",
            "chunk_retrieval_log",
        ]
        result = {}
        for table in tables:
            count = await conn.fetchval(f"SELECT COUNT(*) FROM {table}")
            result[table] = count
        return {"tables": result}


@router.get("/users")
async def view_users(limit: int = Query(50, le=200), offset: int = Query(0, ge=0)):
    """View all users (passwords masked)."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, email, '***' as password_hash, display_name, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2",
            limit, offset,
        )
        total = await conn.fetchval("SELECT COUNT(*) FROM users")
        return {"total": total, "offset": offset, "limit": limit, "data": [dict(r) for r in rows]}


@router.get("/conversations")
async def view_conversations(limit: int = Query(50, le=200), offset: int = Query(0, ge=0)):
    """View all conversations."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT c.id, c.user_id, u.email as user_email, c.type, c.title, c.created_at, c.updated_at
               FROM conversations c LEFT JOIN users u ON c.user_id = u.id
               ORDER BY c.updated_at DESC LIMIT $1 OFFSET $2""",
            limit, offset,
        )
        total = await conn.fetchval("SELECT COUNT(*) FROM conversations")
        return {"total": total, "offset": offset, "limit": limit, "data": [dict(r) for r in rows]}


@router.get("/messages")
async def view_messages(
    conversation_id: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
):
    """View messages, optionally filtered by conversation_id."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        if conversation_id:
            rows = await conn.fetch(
                """SELECT m.id, m.conversation_id, m.reasoning_mode, m.message, m.confidence, m.consistency, m.pre_thinking, m.created_at
                   FROM messages m WHERE m.conversation_id = $1
                   ORDER BY m.created_at ASC LIMIT $2 OFFSET $3""",
                conversation_id, limit, offset,
            )
            total = await conn.fetchval("SELECT COUNT(*) FROM messages WHERE conversation_id = $1", conversation_id)
        else:
            rows = await conn.fetch(
                """SELECT m.id, m.conversation_id, m.reasoning_mode, m.message, m.confidence, m.consistency, m.pre_thinking, m.created_at
                   FROM messages m ORDER BY m.created_at DESC LIMIT $1 OFFSET $2""",
                limit, offset,
            )
            total = await conn.fetchval("SELECT COUNT(*) FROM messages")
        return {"total": total, "offset": offset, "limit": limit, "data": [dict(r) for r in rows]}


@router.get("/messages/{message_id}")
async def view_message_detail(message_id: str):
    """View full details of a single message including JSONB content."""
    import json as _json
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM messages WHERE id = $1", message_id,
        )
        if not row:
            raise HTTPException(status_code=404, detail="Message not found")
        data = dict(row)
        # Parse JSONB message content
        if isinstance(data.get("message"), str):
            data["message"] = _json.loads(data["message"])
        return data


@router.get("/debate-sessions")
async def view_debate_sessions(limit: int = Query(50, le=200), offset: int = Query(0, ge=0)):
    """View all debate sessions."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT d.id, d.user_id, u.email as user_email, d.conversation_id, d.topic,
                      LENGTH(d.debate_messages::text) as messages_size,
                      LENGTH(d.verdict_text) as verdict_size, d.created_at
               FROM debate_sessions d LEFT JOIN users u ON d.user_id = u.id
               ORDER BY d.created_at DESC LIMIT $1 OFFSET $2""",
            limit, offset,
        )
        total = await conn.fetchval("SELECT COUNT(*) FROM debate_sessions")
        return {"total": total, "offset": offset, "limit": limit, "data": [dict(r) for r in rows]}


@router.get("/debate-sessions/{session_id}")
async def view_debate_session_detail(session_id: str):
    """View full details of a single debate session."""
    import json as _json
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM debate_sessions WHERE id = $1", session_id)
        if not row:
            raise HTTPException(status_code=404, detail="Debate session not found")
        data = dict(row)
        if isinstance(data.get("debate_messages"), str):
            data["debate_messages"] = _json.loads(data["debate_messages"])
        return data


@router.get("/mistakes")
async def view_mistakes(limit: int = Query(50, le=200), offset: int = Query(0, ge=0)):
    """View all detected mistakes."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT dm.id, dm.message_id, dm.user_id, u.email as user_email,
                      dm.description, dm.severity, dm.created_at
               FROM detected_mistakes dm LEFT JOIN users u ON dm.user_id = u.id
               ORDER BY dm.created_at DESC LIMIT $1 OFFSET $2""",
            limit, offset,
        )
        total = await conn.fetchval("SELECT COUNT(*) FROM detected_mistakes")
        return {"total": total, "offset": offset, "limit": limit, "data": [dict(r) for r in rows]}


@router.get("/chunk-logs")
async def view_chunk_logs(limit: int = Query(50, le=200), offset: int = Query(0, ge=0)):
    """View chunk retrieval logs."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT id, message_id, qdrant_chunk_id, pdf_id, similarity_score, quality_score, created_at
               FROM chunk_retrieval_log ORDER BY created_at DESC LIMIT $1 OFFSET $2""",
            limit, offset,
        )
        total = await conn.fetchval("SELECT COUNT(*) FROM chunk_retrieval_log")
        return {"total": total, "offset": offset, "limit": limit, "data": [dict(r) for r in rows]}


@router.get("/stats")
async def view_stats():
    """Get database statistics."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        stats = {}
        stats["users"] = await conn.fetchval("SELECT COUNT(*) FROM users")
        stats["conversations"] = await conn.fetchval("SELECT COUNT(*) FROM conversations")
        stats["conversations_standard"] = await conn.fetchval("SELECT COUNT(*) FROM conversations WHERE type = 'standard'")
        stats["conversations_debate"] = await conn.fetchval("SELECT COUNT(*) FROM conversations WHERE type = 'debate'")
        stats["messages"] = await conn.fetchval("SELECT COUNT(*) FROM messages")
        stats["debate_sessions"] = await conn.fetchval("SELECT COUNT(*) FROM debate_sessions")
        stats["detected_mistakes"] = await conn.fetchval("SELECT COUNT(*) FROM detected_mistakes")
        stats["chunk_retrieval_logs"] = await conn.fetchval("SELECT COUNT(*) FROM chunk_retrieval_log")

        # Recent activity
        recent_conv = await conn.fetchrow("SELECT created_at FROM conversations ORDER BY created_at DESC LIMIT 1")
        stats["last_conversation_at"] = str(recent_conv["created_at"]) if recent_conv else None

        return stats
