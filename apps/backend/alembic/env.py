import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from app.db.base import Base
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online() -> None:
    from app.core.config import settings
    from sqlalchemy.ext.asyncio import create_async_engine
    import ssl
    from uuid import uuid4

    database_url = settings.DATABASE_URL
    is_pooler = database_url and (":6543" in database_url or "pgbouncer" in database_url)
    connect_args = {}

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

    # Configure custom SSL context to bypass self-signed certificate verification issues
    if database_url and ("supabase.co" in database_url or "supabase.com" in database_url or settings.ENVIRONMENT == "production"):
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ssl_context

    if is_pooler:
        # Disable statement caching in asyncpg for transaction pooler compatibility
        connect_args["statement_cache_size"] = 0
        connect_args["prepared_statement_cache_size"] = 0
        connect_args["prepared_statement_name_func"] = lambda: f"__asyncpg_{uuid4().hex}__"

    connectable = create_async_engine(
        database_url,
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()

if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
