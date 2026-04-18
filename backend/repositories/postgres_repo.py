import os
import uuid
from datetime import datetime
import json as _json

import asyncpg
from dotenv import load_dotenv
from core.exceptions import DatabaseError

load_dotenv()

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    """Returns the global asyncpg connection pool singleton."""
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            os.getenv("DATABASE_URL"),
            min_size=2,
            max_size=10,
        )
    return _pool


async def close_pool():
    """Close the global pool on shutdown."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


# ─── Table Definitions ────────────────────────────────────────────────────────

CREATE_TABLES_SQL = """
-- Enum types
DO $$ BEGIN
    CREATE TYPE conv_type AS ENUM ('standard', 'debate');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE reasoning_type AS ENUM ('standard', 'deep_research', 'multi_agent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE mistake_severity AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type conv_type NOT NULL DEFAULT 'standard',
    title VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Messages table
-- Each row is one full query+response turn.
-- message JSONB stores an array: [{"user": "...", "assistant": "..."}, ...]
-- New messages are appended as new dicts in the array.
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    reasoning_mode reasoning_type NOT NULL,
    message JSONB NOT NULL DEFAULT '[]',
    confidence NUMERIC(4,3) CHECK (confidence BETWEEN 0 AND 1),
    consistency NUMERIC(4,3) CHECK (consistency BETWEEN 0 AND 1),
    pre_thinking JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Debate sessions table
CREATE TABLE IF NOT EXISTS debate_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    debate_messages JSONB NOT NULL DEFAULT '[]',
    verdict_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Detected mistakes table
CREATE TABLE IF NOT EXISTS detected_mistakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    severity mistake_severity NOT NULL DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Chunk retrieval log table
CREATE TABLE IF NOT EXISTS chunk_retrieval_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    qdrant_chunk_id VARCHAR(255),
    pdf_id VARCHAR(255),
    similarity_score FLOAT,
    quality_score FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_created ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_debate_sessions_user_id ON debate_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_debate_sessions_conversation_id ON debate_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_detected_mistakes_user_id ON detected_mistakes(user_id);
CREATE INDEX IF NOT EXISTS idx_chunk_retrieval_message_id ON chunk_retrieval_log(message_id);
"""


async def init_db():
    """Initialize the database: create all tables and indexes."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(CREATE_TABLES_SQL)
    print("[postgres] Database initialized successfully.")


# ─── Helper Functions ─────────────────────────────────────────────────────────


async def create_user(
    email: str, password_hash: str, display_name: str | None = None
) -> str:
    """Create a new user and return their UUID."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id",
            email,
            password_hash,
            display_name,
        )
        return str(row["id"])


async def get_user_by_email(email: str) -> dict | None:
    """Fetch a user by email. Returns dict or None."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, email, password_hash, display_name FROM users WHERE email = $1",
            email,
        )
        if row:
            return dict(row)
        return None


async def get_user_by_id(user_id: str) -> dict | None:
    """Fetch a user by UUID. Returns dict or None."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, email, display_name FROM users WHERE id = $1",
            uuid.UUID(user_id),
        )
        if row:
            return dict(row)
        return None


async def create_conversation(
    user_id: str, conv_type: str = "standard", title: str | None = None
) -> str:
    """Create a new conversation and return its UUID."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO conversations (user_id, type, title) VALUES ($1, $2, $3) RETURNING id",
            uuid.UUID(user_id),
            conv_type,
            title,
        )
        return str(row["id"])


async def append_message(
    conversation_id: str,
    reasoning_mode: str,
    user_content: str,
    assistant_content: str,
    confidence: float | None = None,
    consistency: float | None = None,
    pdfs: list[str] | None = None,
    pre_thinking: dict | None = None,
    tools: list[str] | None = None,
) -> str:
    """
    Append a user+assistant pair as a new row in the messages table.
    Each row represents one full query+response turn.
    Returns the new message row UUID.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        new_entry = {"user": user_content, "assistant": assistant_content}
        if pdfs:
            new_entry["pdfs"] = pdfs
        if tools:
            new_entry["tools"] = tools
        row = await conn.fetchrow(
            "INSERT INTO messages (conversation_id, reasoning_mode, message, confidence, consistency, pre_thinking) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            uuid.UUID(conversation_id),
            reasoning_mode,
            _json.dumps([new_entry]),
            confidence,
            consistency,
            _json.dumps(pre_thinking) if pre_thinking else None,
        )
        return str(row["id"])


async def create_debate_session(
    user_id: str,
    conversation_id: str,
    topic: str,
    debate_messages: list[dict],
    verdict_text: str | None = None,
) -> str:
    """Persist a debate session and return its UUID."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO debate_sessions (user_id, conversation_id, topic, debate_messages, verdict_text) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            uuid.UUID(user_id),
            uuid.UUID(conversation_id),
            topic,
            _json.dumps(debate_messages),
            verdict_text,
        )
        return str(row["id"])


async def get_debate_session_by_conversation_id(conversation_id: str, user_id: str) -> dict | None:
    """Fetch a debate session by its conversation UUID for the authenticated user."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, user_id, conversation_id, topic, debate_messages, verdict_text, created_at
            FROM debate_sessions
            WHERE conversation_id = $1 AND user_id = $2
            """,
            uuid.UUID(conversation_id),
            uuid.UUID(user_id),
        )
        if not row:
            return None

        data = dict(row)
        if isinstance(data.get("debate_messages"), str):
            data["debate_messages"] = _json.loads(data["debate_messages"])
        return data


async def get_user_history(user_id: str) -> list[dict]:
    """Get conversation metadata for a user, ordered by most recent."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                c.id AS conv_id,
                c.type AS conv_type,
                c.title,
                c.created_at AS conv_created,
                c.updated_at AS conv_updated
            FROM conversations c
            WHERE c.user_id = $1
            ORDER BY c.updated_at DESC
            """,
            uuid.UUID(user_id),
        )

        return [
            {
                "id": str(row["conv_id"]),
                "type": row["conv_type"],
                "title": row["title"],
                "created_at": row["conv_created"].isoformat()
                if row["conv_created"]
                else None,
                "updated_at": row["conv_updated"].isoformat()
                if row["conv_updated"]
                else None,
                "messages": [],
            }
            for row in rows
        ]


async def update_conversation_timestamp(conversation_id: str):
    """Update the updated_at timestamp for a conversation."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE conversations SET updated_at = NOW() WHERE id = $1",
            uuid.UUID(conversation_id),
        )


async def rename_conversation(
    conversation_id: str, user_id: str, new_title: str
) -> bool:
    """Rename a conversation title. Returns True if updated."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3",
            new_title,
            uuid.UUID(conversation_id),
            uuid.UUID(user_id),
        )
        return result == "UPDATE 1"


async def delete_conversation(conversation_id: str, user_id: str) -> bool:
    """Delete a conversation and all its messages. Returns True if deleted."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM conversations WHERE id = $1 AND user_id = $2",
            uuid.UUID(conversation_id),
            uuid.UUID(user_id),
        )
        return result == "DELETE 1"


async def clear_all_history(user_id: str) -> int:
    """Delete all conversations for a user. Returns count deleted."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM conversations WHERE user_id = $1",
            uuid.UUID(user_id),
        )
        return int(result.split()[-1]) if result.startswith("DELETE") else 0


async def log_chunk_retrieval(
    message_id: str | None,
    qdrant_chunk_id: str,
    pdf_id: str,
    similarity_score: float,
    quality_score: float | None = None,
) -> str:
    """Log a chunk retrieval for analytics."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO chunk_retrieval_log (message_id, qdrant_chunk_id, pdf_id, similarity_score, quality_score) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            uuid.UUID(message_id) if message_id else None,
            qdrant_chunk_id,
            pdf_id,
            similarity_score,
            quality_score,
        )
        return str(row["id"])


async def get_pdf_quality_scores(pdf_ids: list[str]) -> dict[str, float]:
    """Get the average similarity score for a list of pdf_ids from chunk_retrieval_log."""
    if not pdf_ids:
        return {}
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT pdf_id, AVG(similarity_score) as avg_score FROM chunk_retrieval_log WHERE pdf_id = ANY($1::text[]) GROUP BY pdf_id",
            pdf_ids,
        )
        return {row["pdf_id"]: float(row["avg_score"]) for row in rows}


async def get_conversation_with_messages(conversation_id: str, user_id: str) -> dict:
    """Get a specific conversation and all its messages. Raises ValueError if not found."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        conv = await conn.fetchrow(
            "SELECT id, type, title FROM conversations WHERE id = $1 AND user_id = $2",
            uuid.UUID(conversation_id),
            uuid.UUID(user_id),
        )
        if not conv:
            raise ValueError("Conversation not found")

        msgs = await conn.fetch(
            "SELECT id, reasoning_mode, message, confidence, consistency, pre_thinking, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC",
            uuid.UUID(conversation_id),
        )

        messages = []
        for m in msgs:
            content = m["message"]
            if isinstance(content, str):
                content = _json.loads(content)
            pre_thinking = m.get("pre_thinking")
            if pre_thinking and not isinstance(pre_thinking, dict):
                pre_thinking = _json.loads(pre_thinking) if pre_thinking else None
            messages.append(
                {
                    "id": str(m["id"]),
                    "reasoning_mode": m["reasoning_mode"],
                    "content": content,
                    "confidence": float(m["confidence"]) if m["confidence"] else None,
                    "consistency": float(m["consistency"])
                    if m["consistency"]
                    else None,
                    "pre_thinking": pre_thinking,
                    "created_at": m["created_at"].isoformat()
                    if m["created_at"]
                    else None,
                }
            )

        return {
            "conversation": {
                "id": str(conv["id"]),
                "type": conv["type"],
                "title": conv["title"],
            },
            "messages": messages,
        }


async def log_detected_mistakes(
    message_id: str, user_id: str, mistakes: list[dict]
) -> None:
    """Log serious mistakes to the detected_mistakes table."""
    if not mistakes:
        return
    pool = await get_pool()
    async with pool.acquire() as conn:
        values = []
        for m in mistakes:
            sev = str(m.get("severity", "medium")).lower()
            if sev not in ("low", "medium", "high"):
                sev = "medium"
            desc = str(m.get("description", ""))
            if desc:
                values.append((uuid.UUID(message_id), uuid.UUID(user_id), desc, sev))

        if values:
            await conn.executemany(
                "INSERT INTO detected_mistakes (message_id, user_id, description, severity) VALUES ($1, $2, $3, $4)",
                values,
            )
