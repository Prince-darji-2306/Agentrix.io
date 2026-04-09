"""
delete.py — Drop all PostgreSQL tables and Qdrant collections.
Run this to reset the database before applying new schema changes.
Usage: python delete.py
"""

import os
import asyncio
import asyncpg
from dotenv import load_dotenv
from qdrant_client import QdrantClient

load_dotenv()


async def drop_all_tables():
    """Drop all tables, enums, and indexes from PostgreSQL."""
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    try:
        # Drop tables (CASCADE handles FK dependencies)
        await conn.execute("DROP TABLE IF EXISTS chunk_retrieval_log CASCADE;")
        await conn.execute("DROP TABLE IF EXISTS detected_mistakes CASCADE;")
        await conn.execute("DROP TABLE IF EXISTS debate_sessions CASCADE;")
        await conn.execute("DROP TABLE IF EXISTS messages CASCADE;")
        await conn.execute("DROP TABLE IF EXISTS conversations CASCADE;")
        await conn.execute("DROP TABLE IF EXISTS users CASCADE;")

        # Drop enum types
        await conn.execute("DROP TYPE IF EXISTS conv_type CASCADE;")
        await conn.execute("DROP TYPE IF EXISTS debate_winner CASCADE;")
        await conn.execute("DROP TYPE IF EXISTS mistake_severity CASCADE;")
        await conn.execute("DROP TYPE IF EXISTS reasoning_type CASCADE;")

        print("[delete] All PostgreSQL tables and enums dropped.")
    finally:
        await conn.close()


def drop_qdrant_collections():
    """Delete Qdrant collections."""
    client = QdrantClient(
        url=os.getenv("QDRANT_CLIENT"),
        api_key=os.getenv("QDRANT_API_KEY"),
    )
    collections = [c.name for c in client.get_collections().collections]
    for name in collections:
        client.delete_collection(name)
        print(f"[delete] Deleted Qdrant collection: {name}")

    if not collections:
        print("[delete] No Qdrant collections found.")


async def main():
    print("=" * 50)
    print("  Agentrix.io — Database Cleanup Script")
    print("=" * 50)

    await drop_all_tables()
    drop_qdrant_collections()

    print("\n[delete] Cleanup complete. Run `python main.py` to reinitialize.")


if __name__ == "__main__":
    asyncio.run(main())