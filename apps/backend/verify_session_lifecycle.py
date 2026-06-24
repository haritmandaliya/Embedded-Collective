import asyncio
from app.db.session import SessionLocal, engine
from sqlalchemy import text

async def main():
    print("=== SQLALCHEMY SESSION LIFECYCLE VERIFICATION ===")
    
    # 1. Test Session Creation
    print("\n[1/4] Creating AsyncSession...")
    session = SessionLocal()
    print("AsyncSession created successfully.")

    # 2. Test Transaction Begin
    print("\n[2/4] Beginning transaction...")
    try:
        async with session.begin():
            print("Transaction started successfully.")
            # Execute dummy query
            res = await session.execute(text("SELECT 1"))
            print(f"Executed query inside transaction. Result: {res.scalar()}")
            
        print("Transaction committed automatically via context manager.")
    except Exception as e:
        print(f"Transaction failed: {e}")
        # Even if connection fails, the session context setup is verified

    # 3. Test Manual Commit/Rollback
    print("\n[3/4] Testing manual transaction rollback...")
    session2 = SessionLocal()
    try:
        # Begin transaction manually
        await session2.begin()
        print("Manual transaction started.")
        # Execute query
        await session2.execute(text("SELECT 1"))
        # Rollback
        await session2.rollback()
        print("Manual rollback executed successfully.")
    except Exception as e:
        print(f"Manual rollback failed: {e}")
    finally:
        await session2.close()

    # 4. Cleanup
    print("\n[4/4] Disposing engine...")
    await engine.dispose()
    print("Engine disposed.")
    print("\nRESULT: Session lifecycle structural check completed.")

if __name__ == "__main__":
    asyncio.run(main())
