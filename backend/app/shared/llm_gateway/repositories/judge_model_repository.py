"""Database access for the LangFuse-configured LLM-as-Judge model (llm_gateway).

The judge model is configured in the separate LangFuse Postgres DB and mapped to
our internal ``shared_model`` table. Both lookups live here so the service layer
stays free of SQL/SQLAlchemy query construction (Achse 2: ``services`` >
``repositories``). All failures fail open (return ``None`` / ``False``).
"""

from __future__ import annotations

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger(__name__)

_LANGFUSE_DSN = "postgresql://langfuse:langfuse@host.docker.internal:5433/langfuse"  # pragma: allowlist secret


async def get_langfuse_judge_model_name(project_id: str) -> str | None:
    """Returns the LangFuse-configured judge model name for *project_id*, or ``None``.

    Fails open: a LangFuse DB error is logged and treated as "no judge configured".
    """
    try:
        import asyncpg

        conn = await asyncpg.connect(_LANGFUSE_DSN)
        try:
            row = await conn.fetchrow(
                "SELECT model FROM default_llm_models WHERE project_id = $1 LIMIT 1",
                project_id,
            )
        finally:
            await conn.close()
    except Exception:
        logger.exception("judge_model_repository: LangFuse DB query failed")
        return None

    if row is None:
        return None
    name: str = row["model"]
    return name


async def get_internal_model_id_by_name(db: AsyncSession, name: str) -> int | None:
    """Maps a LangFuse model name to our internal model id (openrouter_id or display_name)."""
    try:
        result = await db.execute(
            text(
                """
                SELECT m.id FROM shared_model m
                WHERE m.openrouter_id ILIKE :pattern
                   OR m.display_name ILIKE :pattern
                LIMIT 1
                """,
            ),
            {"pattern": f"%{name}%"},
        )
        internal = result.fetchone()
        if internal:
            return int(internal[0])
    except Exception:
        logger.exception("judge_model_repository: internal model mapping failed")
    return None


async def get_internal_id_by_display_name(db: AsyncSession, name: str) -> int | None:
    """Maps a LangFuse model name to our internal model id by ``display_name``."""
    try:
        result = await db.execute(
            text("SELECT id FROM shared_model WHERE display_name ILIKE :p LIMIT 1"),
            {"p": f"%{name}%"},
        )
        internal = result.fetchone()
        if internal:
            return int(internal[0])
    except Exception:
        logger.exception("judge_model_repository: display-name mapping failed")
    return None


async def get_judge_internal_model_id(db: AsyncSession, project_id: str) -> int | None:
    """Returns our internal model id for the LangFuse judge model, or ``None``."""
    name = await get_langfuse_judge_model_name(project_id)
    if name is None:
        return None
    return await get_internal_model_id_by_name(db, name)


async def is_judge_model(db: AsyncSession, model_id: int, project_id: str) -> bool:
    """Returns ``True`` when *model_id* is the LangFuse-configured judge model.

    Fails open: when LangFuse is unreachable or no judge is configured, returns
    ``False`` (the operation is allowed).
    """
    name = await get_langfuse_judge_model_name(project_id)
    if name is None:
        return False
    internal = await get_internal_id_by_display_name(db, name)
    return internal is not None and internal == model_id
