import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def test_conn():
    url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:[PASSWORD]@db.supabase.co:5432/postgres")
    print("Testing connection to database...")
    engine = create_async_engine(url)
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT 1"))
        print("Success! Connection returned:", res.scalar())
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_conn())
