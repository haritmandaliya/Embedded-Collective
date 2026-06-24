import asyncio
from sqlalchemy import text
from app.db.session import engine

async def main():
    print("=== SQLALCHEMY CONNECTION VERIFICATION ===")
    
    try:
        async with engine.connect() as conn:
            print("\nExecuting query SELECT 1...")
            res = await conn.execute(text("SELECT 1"))
            print(f"Result: {res.scalar()}")
        await engine.dispose()
        print("\nRESULT: SUCCESS")
    except Exception as e:
        print(f"\nConnection failed: {e}")
        print("\nRESULT: FAILURE")

if __name__ == "__main__":
    asyncio.run(main())
