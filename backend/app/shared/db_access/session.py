"""Async database engine and session factory for FastAPI."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.shared.config.config import settings


def build_engine_kwargs(database_url: str) -> dict[str, object]:
    """Return dialect-specific pooling kwargs for ``create_async_engine``.

    SQLite (used in tests) runs on StaticPool, which rejects QueuePool
    sizing arguments like ``pool_size`` and ``max_overflow``.

    Args:
        database_url: SQLAlchemy database URL deciding the dialect.

    Returns:
        dict[str, object]: Pooling kwargs for Postgres, empty for SQLite.
    """
    if database_url.startswith("sqlite"):
        return {}
    return {
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
        "connect_args": {"timeout": 10},
    }


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    pool_pre_ping=True,
    pool_recycle=1800,
    **build_engine_kwargs(settings.DATABASE_URL),
)

AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


def init_pool_guard() -> None:
    """Register the connection-pool guard on the engine's sync pool.

    Must be called once during application startup (before any DB access).
    Skips silently on SQLite (StaticPool has no ``checkout`` events).
    """
    from app.shared.db_access.pool_guard import PoolGuard

    # Access the underlying sync engine to get the connection pool
    sync_engine = engine.sync_engine
    pool = sync_engine.pool

    guard = PoolGuard(
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
    )

    event.listen(pool, "checkout", guard.on_checkout)
    event.listen(pool, "checkin", guard.on_checkin)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that provides a transactional async database session.

    Yields an AsyncSession that is automatically closed after the request
    completes. Use with FastAPI's Depends() mechanism.

    Yields:
        AsyncSession: An active database session scoped to the current request.

    Example:
        @router.get("/items")
        async def list_items(
            db: AsyncSession = Depends(get_db),
        ) -> list[Item]:
            result = await db.execute(select(Item))
            return list(result.scalars().all())
    """
    async with AsyncSessionLocal() as session:
        yield session


# ── gjo_se_com-Alias (Namespace-Merge Finding 7) ────────────────────────────
# ``get_gjo_se_db`` bleibt als Name für die bisherigen gjo-Nutzer erhalten –
# es gibt weiterhin genau EINEN Engine und EINE Session-Factory (DB ``gjose``).
get_gjo_se_db = get_db


@asynccontextmanager
async def open_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield a fresh, isolated DB session for one background unit of work (K3).

    Each observer iteration / send / run opens its own session instead of
    reusing the caller's transaction. The factory is the module-global
    ``AsyncSessionLocal``, so tests can still monkeypatch it.

    Yields:
        A fresh session that closes when the ``async with`` block exits.
    """
    async with AsyncSessionLocal() as session:
        yield session


__all__ = [
    "AsyncSessionLocal",
    "build_engine_kwargs",
    "engine",
    "get_db",
    "get_gjo_se_db",
    "init_pool_guard",
    "open_session",
]
