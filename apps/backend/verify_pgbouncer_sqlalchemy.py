import asyncio
from sqlalchemy import text
from app.db.session import engine

async def main():
    print("=== SQLALCHEMY PGBOUNCER VERIFICATION ===")
    try:
        async with engine.connect() as conn:
            print("\n[1/3] Executing SELECT version()...")
            version = await conn.execute(text("SELECT version()"))
            print(f"Version: {version.scalar()}")
            
            print("\n[2/3] Executing SELECT NOW()...")
            now = await conn.execute(text("SELECT NOW()"))
            print(f"Time: {now.scalar()}")
            
            print("\n[3/3] Executing SELECT 1...")
            one = await conn.execute(text("SELECT 1"))
            print(f"Result: {one.scalar()}")
            
        await engine.dispose()
        print("\nRESULT: SUCCESS")
    except Exception as e:
        print(f"\nConnection failed: {e}")
        print("\nRESULT: FAILURE")

if __name__ == "__main__":
    asyncio.run(main())
