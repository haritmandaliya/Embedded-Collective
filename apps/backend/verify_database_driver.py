import asyncio
import os
import sys
import sqlalchemy
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def main():
    # Load .env file
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

    raw_url = os.getenv("DATABASE_URL")
    if not raw_url:
        print("Error: DATABASE_URL not set in environment.")
        sys.exit(1)

    # Apply replacement logic for output print matching settings behavior
    parsed_url = raw_url
    if parsed_url.startswith("postgresql://"):
        parsed_url = parsed_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    print("=== DATABASE DRIVER DIAGNOSTICS ===")
    print(f"SQLAlchemy Version : {sqlalchemy.__version__}")
    
    try:
        import asyncpg
        print(f"asyncpg Version    : {asyncpg.__version__}")
    except ImportError:
        print("asyncpg Version    : NOT INSTALLED")

    print(f"Raw DATABASE_URL   : {raw_url.split('@')[-1]}")
    print(f"Parsed DATABASE_URL: {parsed_url.split('@')[-1]}")

    try:
        engine = create_async_engine(parsed_url)
        print(f"Driver Name        : {engine.dialect.driver}")
        print(f"Engine Type        : {type(engine).__name__}")
        
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT 1"))
            val = res.scalar()
            if val == 1:
                print("Connection Status  : SUCCESS")
            else:
                print(f"Connection Status  : FAILED (Returned: {val})")
        
        await engine.dispose()
    except Exception as e:
        print(f"Connection Status  : FAILED ({e})")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
