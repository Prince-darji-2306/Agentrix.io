import asyncio
from repositories.postgres_repo import get_pool

async def main():
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute('ALTER TABLE messages ADD COLUMN IF NOT EXISTS what_happened JSONB DEFAULT NULL')
        print('Column added successfully')
    await pool.close()

asyncio.run(main())