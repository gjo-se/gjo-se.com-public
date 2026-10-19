"""Database access for the external-catalog → technology-catalog sync (gjo_se_com).

Holds the SQLAlchemy/ORM operations of the catalog sync: technology upsert with
slug-collision resolution, ``core_statusable`` status resolution, icon-record
creation, deprecated marking, and import-run finalization. Extracted 1:1 from
``catalog_sync_service`` so the service stays query-free and this DB-bound module
is excluded from the unit-mutation catalogue (unit-kanon "Unit ohne DB").
"""

from __future__ import annotations

from datetime import UTC, datetime

import structlog
from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access.session import AsyncSessionLocal
from app.shared.technology_catalog.models.technology import Technology
from app.shared.technology_catalog.models.technology_import_run import TechnologyImportRun
from app.shared.technology_catalog.repositories.technology_icon_sync_repository import (
    _extract_icon_external_id,
    ensure_icons,
)
from app.shared.technology_catalog.repositories.technology_write_repository import (
    _build_technology_values,
    _map_color,
    _resolve_slug_collision,
    upsert_technology,
)
from app.shared.technology_catalog.schemas.technology_schemas import TechnologySyncResultOut

# Frozen-test compatibility re-exports (historical import paths). The upsert and
# the icon helper live in the split modules after the LCOM4 split.
__all__ = [
    "AsyncSessionLocal",
    "_build_technology_values",
    "_extract_icon_external_id",
    "_map_color",
    "_resolve_slug_collision",
    "ensure_icons",
    "fail_import_run",
    "finalize_import_run",
    "mark_deprecated",
    "start_import_run",
    "upsert_statusable",
    "upsert_technology",
]

logger = structlog.get_logger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────────

_STATUSABLE_TYPE = "technology_catalog"
_STATUS_CATEGORY = "lifecycle"

# ── Lazy imports – core_statusable may be in a separate database or unavailable ─

_Status: type | None = None
_Statusable: type | None = None
try:
    from app.shared.status.models.status import Status as _CS
    from app.shared.status.models.status import Statusable as _CSB

    _Status = _CS
    _Statusable = _CSB
except ImportError:
    logger.warning("core_statusable models not available – status updates will be skipped")


# ── Public: import run ─────────────────────────────────────────────────────────


async def start_import_run(db: AsyncSession) -> TechnologyImportRun:
    """Creates, persists and returns a new import run in ``running`` state.

    The service receives the run as an opaque handle and hands it back to
    :func:`finalize_import_run` / :func:`fail_import_run`; the service never
    imports the ORM model (Achse 2: ``services`` > ``repositories``).

    Args:
        db: Active async session for the catalog database.

    Returns:
        The newly persisted ``TechnologyImportRun`` row.
    """
    import_run = TechnologyImportRun(
        started_at=datetime.now(UTC),
        status="running",
        total_fetched=0,
        created=0,
        updated=0,
        unchanged=0,
        errors=0,
    )
    db.add(import_run)
    await db.commit()
    return import_run


# ── Private: status management ─────────────────────────────────────────────────


async def resolve_status_id(db: AsyncSession, status_name: str) -> int | None:
    """Resolve a Status name + category to its DB id.

    Returns None if the core_status table is unavailable (e.g. separate database).
    """
    if _Status is None:
        return None

    try:
        result = await db.execute(
            select(_Status.id).where(
                _Status.name == status_name,
                _Status.category == _STATUS_CATEGORY,
            )
        )
        row = result.fetchone()
        return row[0] if row is not None else None
    except Exception:
        logger.exception(
            "core_status table not available – skipping status resolution",
        )
        return None


async def upsert_statusable(
    db: AsyncSession,
    technology_id: int,
    status_name: str,
) -> None:
    """Insert or update the core_statusable entry for a technology.

    Follows the same delete-then-insert pattern as
    ``statusable_repository.set_status()``.
    """
    if _Statusable is None:
        logger.warning(
            "core_statusable not available – status skipped for technology id=%s",
            technology_id,
        )
        return

    status_id = await resolve_status_id(db, status_name)
    if status_id is None:
        logger.warning(
            "Status '%s' not found in core_status (category=%s) – skipping for id=%s",
            status_name,
            _STATUS_CATEGORY,
            technology_id,
        )
        return

    _ = await db.execute(
        sa_delete(_Statusable).where(
            _Statusable.statusable_type == _STATUSABLE_TYPE,
            _Statusable.statusable_id == technology_id,
        )
    )
    db.add(
        _Statusable(
            status_id=status_id,
            statusable_type=_STATUSABLE_TYPE,
            statusable_id=technology_id,
        )
    )


# ── Private: deprecated marking ────────────────────────────────────────────────


async def mark_deprecated(
    db: AsyncSession,
    fetch_ids: set[str],
) -> int:
    """Mark all technologies whose ``external_id`` is NOT in ``fetch_ids`` as deprecated.

    Only considers entries where ``external_id IS NOT NULL``.

    Returns:
        Number of entries marked as deprecated.
    """
    if _Statusable is None:
        logger.warning("core_statusable not available – skipping deprecated marking")
        return 0

    deprecated_status_id = await resolve_status_id(db, "deprecated")
    if deprecated_status_id is None:
        logger.warning("Deprecated status not found in core_status – skipping")
        return 0

    db_entries = (
        await db.execute(select(Technology.id, Technology.external_id).where(Technology.external_id.isnot(None)))
    ).all()

    deprecated_count = 0
    for tech_id, ext_id in db_entries:
        if ext_id is not None and ext_id not in fetch_ids:
            _ = await db.execute(
                sa_delete(_Statusable).where(
                    _Statusable.statusable_type == _STATUSABLE_TYPE,
                    _Statusable.statusable_id == tech_id,
                )
            )
            db.add(
                _Statusable(
                    status_id=deprecated_status_id,
                    statusable_type=_STATUSABLE_TYPE,
                    statusable_id=tech_id,
                )
            )
            deprecated_count += 1

    if deprecated_count > 0:
        logger.info("Marked %d technologies as deprecated", deprecated_count)

    return deprecated_count


# ── Private: import run finalization ────────────────────────────────────────────


async def finalize_import_run(
    db: AsyncSession,
    import_run: TechnologyImportRun,
    result: TechnologySyncResultOut,
    total_fetched: int,
) -> None:
    """Set import run to completed with counts and persist."""
    import_run.completed_at = datetime.now(UTC)
    import_run.status = "completed"
    import_run.total_fetched = total_fetched
    import_run.created = result.created
    import_run.updated = result.updated
    import_run.unchanged = result.unchanged
    import_run.errors = result.errors
    db.add(import_run)
    await db.commit()


async def fail_import_run(
    db: AsyncSession,
    import_run: TechnologyImportRun,
    exc: Exception,
) -> None:
    """Mark import run as failed – best-effort, never raises."""
    try:
        # Rollback any aborted transaction before attempting to persist
        await db.rollback()
        import_run.completed_at = datetime.now(UTC)
        import_run.status = "failed"
        import_run.error_message = str(exc)
        db.add(import_run)
        await db.commit()
    except Exception:
        logger.exception("Failed to persist failed import_run state")
