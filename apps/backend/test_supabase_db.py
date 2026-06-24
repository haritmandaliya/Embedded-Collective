import asyncio
import os
import sys
from sqlalchemy import text
from app.db.session import SessionLocal, engine

async def main():
    print("Connecting to database using application SessionLocal configurations...")
    
    try:
        async with SessionLocal() as session:
            # 1. Verification of Connection
            print("\n[1/5] Testing database connection...")
            res = await session.execute(text("SELECT 1"))
            print(f"Success! Result: {res.scalar()}")

            # 2. Table Creation (temp verification table)
            print("\n[2/5] Creating temporary verification table...")
            await session.execute(text("""
                CREATE TABLE IF NOT EXISTS _supabase_verification (
                    id SERIAL PRIMARY KEY,
                    key VARCHAR(50) UNIQUE,
                    value VARCHAR(100),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            await session.commit()
            print("Table '_supabase_verification' ensured.")

            # 3. Insert Operation
            print("\n[3/5] Testing INSERT operation...")
            await session.execute(
                text("INSERT INTO _supabase_verification (key, value) VALUES (:key, :value) ON CONFLICT (key) DO UPDATE SET value = :value"),
                {"key": "test_connection", "value": "active"}
            )
            await session.commit()
            print("Row inserted/updated successfully.")

            # 4. Read & Update Operation
            print("\n[4/5] Testing READ and UPDATE operations...")
            read_res = await session.execute(
                text("SELECT value FROM _supabase_verification WHERE key = :key"),
                {"key": "test_connection"}
            )
            current_value = read_res.scalar()
            print(f"Read current value: '{current_value}'")
            
            await session.execute(
                text("UPDATE _supabase_verification SET value = :value WHERE key = :key"),
                {"key": "test_connection", "value": "updated_active"}
            )
            await session.commit()
            
            read_updated = await session.execute(
                text("SELECT value FROM _supabase_verification WHERE key = :key"),
                {"key": "test_connection"}
            )
            print(f"Read updated value: '{read_updated.scalar()}'")

            # 5. Delete Operation
            print("\n[5/5] Testing DELETE operation...")
            await session.execute(
                text("DELETE FROM _supabase_verification WHERE key = :key"),
                {"key": "test_connection"}
            )
            await session.commit()
            
            verify_del = await session.execute(
                text("SELECT COUNT(*) FROM _supabase_verification WHERE key = :key"),
                {"key": "test_connection"}
            )
            print(f"Verification row count post-delete: {verify_del.scalar()}")

        await engine.dispose()
        print("\nAll database verification steps passed successfully!")

    except Exception as e:
        print(f"\nVerification failed with error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
