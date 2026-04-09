"""
test_db_connection.py — Test PostgreSQL and Qdrant connections.
Usage: python test_db_connection.py
"""

import os
import asyncio
import asyncpg
from dotenv import load_dotenv

load_dotenv()


async def test_postgres():
    """Test PostgreSQL connection and list tables."""
    print("=" * 50)
    print("  Testing PostgreSQL Connection")
    print("=" * 50)

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("[FAIL] DATABASE_URL not set in .env")
        return False

    print(f"[INFO] Connecting to: {database_url[:50]}...")

    try:
        conn = await asyncpg.connect(database_url)
        print("[OK] Connected to PostgreSQL successfully!")

        # List tables
        tables = await conn.fetch("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' ORDER BY table_name
        """)

        if tables:
            print(f"\n[INFO] Found {len(tables)} table(s):")
            for row in tables:
                print(f"  - {row['table_name']}")
        else:
            print("\n[WARN] No tables found. Run the server to initialize the database.")

        # Test a simple query
        result = await conn.fetchval("SELECT 1")
        print(f"\n[OK] Test query returned: {result}")

        await conn.close()
        print("[OK] Connection closed.")
        return True

    except Exception as e:
        print(f"[FAIL] PostgreSQL connection error: {e}")
        return False


def test_qdrant():
    """Test Qdrant connection and list collections."""
    print("\n" + "=" * 50)
    print("  Testing Qdrant Connection")
    print("=" * 50)

    qdrant_url = os.getenv("QDRANT_CLIENT")
    qdrant_api_key = os.getenv("QDRANT_API_KEY")

    if not qdrant_url:
        print("[FAIL] QDRANT_CLIENT not set in .env")
        return False

    print(f"[INFO] Connecting to: {qdrant_url}")

    try:
        from qdrant_client import QdrantClient

        client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
        collections = client.get_collections()

        print("[OK] Connected to Qdrant successfully!")

        if collections.collections:
            print(f"\n[INFO] Found {len(collections.collections)} collection(s):")
            for col in collections.collections:
                info = client.get_collection(col.name)
                print(f"  - {col.name} (vectors: {info.points_count})")
        else:
            print("\n[WARN] No collections found. Run the server to initialize collections.")

        return True

    except Exception as e:
        print(f"[FAIL] Qdrant connection error: {e}")
        return False


async def main():
    print("\n🔍 Agentrix.io — Database Connection Test\n")

    pg_ok = await test_postgres()
    qdrant_ok = test_qdrant()

    print("\n" + "=" * 50)
    print("  Results")
    print("=" * 50)
    print(f"  PostgreSQL: {'✅ OK' if pg_ok else '❌ FAILED'}")
    print(f"  Qdrant:     {'✅ OK' if qdrant_ok else '❌ FAILED'}")
    print("=" * 50)

    if pg_ok and qdrant_ok:
        print("\n✅ All connections are working!")
    else:
        print("\n❌ Some connections failed. Check your .env file.")


if __name__ == "__main__":
    asyncio.run(main())