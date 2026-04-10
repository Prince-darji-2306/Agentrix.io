import asyncio
from repositories.postgres_repo import get_pool


async def _column_exists(conn, table: str, column: str) -> bool:
    return bool(
        await conn.fetchval(
            """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = $1
                  AND column_name = $2
            )
            """,
            table,
            column,
        )
    )


async def main():
    pool = await get_pool()
    async with pool.acquire() as conn:
        has_pre_thinking = await _column_exists(conn, "messages", "pre_thinking")
        has_what_happened = await _column_exists(conn, "messages", "what_happened")

        if has_what_happened and not has_pre_thinking:
            await conn.execute(
                "ALTER TABLE messages RENAME COLUMN what_happened TO pre_thinking"
            )
            print("Renamed messages.what_happened to messages.pre_thinking")
        elif has_what_happened and has_pre_thinking:
            await conn.execute(
                """
                UPDATE messages
                SET pre_thinking = COALESCE(pre_thinking, what_happened)
                WHERE what_happened IS NOT NULL
                """
            )
            await conn.execute("ALTER TABLE messages DROP COLUMN what_happened")
            print("Merged data into pre_thinking and dropped what_happened")
        elif not has_pre_thinking:
            await conn.execute(
                "ALTER TABLE messages ADD COLUMN pre_thinking JSONB DEFAULT NULL"
            )
            print("Added messages.pre_thinking")
        else:
            print("messages.pre_thinking already present; no changes needed")
    await pool.close()


asyncio.run(main())
