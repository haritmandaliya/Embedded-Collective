from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings
from typing import AsyncGenerator

connect_args = {}
database_url = settings.DATABASE_URL

is_pooler = database_url and (":6543" in database_url or "pgbouncer" in database_url)

# Clean database_url to remove pgbouncer parameter and append prepared_statement_cache_size=0 if using transaction pooler
if database_url:
    if "?" in database_url:
        base_url, query_str = database_url.split("?", 1)
        params = [p for p in query_str.split("&") if not p.startswith("pgbouncer=") and not p.startswith("prepared_statement_cache_size=")]
    else:
        base_url = database_url
        params = []
        
    if is_pooler:
        params.append("prepared_statement_cache_size=0")
        
    if params:
        database_url = f"{base_url}?{'&'.join(params)}"
    else:
        database_url = base_url

import ssl

# Configure custom SSL context to bypass self-signed certificate verification issues
if database_url and ("supabase.co" in database_url or "supabase.com" in database_url or settings.ENVIRONMENT == "production"):
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    connect_args["ssl"] = ssl_context

from uuid import uuid4

if is_pooler:
    # Disable statement caching in asyncpg for transaction pooler compatibility
    connect_args["statement_cache_size"] = 0
    connect_args["prepared_statement_cache_size"] = 0
    # Use unique statement names to prevent PgBouncer transaction pooler collisions
    connect_args["prepared_statement_name_func"] = lambda: f"__asyncpg_{uuid4().hex}__"

import logging

logger = logging.getLogger("app.db.session")
logger.info(f"Database engine initialized. Pooler Mode: {is_pooler}")

engine = create_async_engine(
    database_url,
    echo=False,
    future=True,
    pool_pre_ping=True,
    pool_size=15,
    max_overflow=10,
    pool_recycle=300,
    connect_args=connect_args,
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
