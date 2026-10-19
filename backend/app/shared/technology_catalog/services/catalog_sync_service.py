"""Catalog Sync Service – external catalog source → Technology Catalog (orchestration).

Idempotent sync run: create new entries, update existing ones, mark entries that
are no longer delivered as deprecated. All DB/ORM access lives in
:mod:`~app.shared.technology_catalog.repositories.technology_sync_repository`;
this service only orchestrates and keeps the pure mapping helpers.
"""

from __future__ import annotations

import structlog

from app.shared.db_access.session_types import AsyncSession
from app.shared.technology_catalog.dependencies.technology_catalog_dependencies import (
    get_catalog_source_client,
)
from app.shared.technology_catalog.repositories import technology_sync_repository as sync_repo
from app.shared.technology_catalog.repositories.technology_sync_repository import AsyncSessionLocal
from app.shared.technology_catalog.schemas.catalog_source_schemas import CatalogSourceTechnologyOut
from app.shared.technology_catalog.schemas.technology_schemas import TechnologySyncResultOut
from app.shared.technology_catalog.services.catalog_embedding_service import CatalogEmbeddingService

logger = structlog.get_logger(__name__)


# ── Public API ─────────────────────────────────────────────────────────────────


async def run_catalog_sync(catalog_embedding_service: CatalogEmbeddingService) -> TechnologySyncResultOut:
    """Fetch the external catalog and sync to core_technology_catalog.

    Performs a full idempotent sync:
    1. Fetch all technologies via CatalogSourceClient
    2. Upsert each entry by ``external_id`` (SELECT → UPDATE/INSERT)
    3. Set ``core_statusable`` status (approved/pending/rejected/deprecated)
    4. Create ``core_technology_catalog_icon`` records for dark + light variants
    5. Mark entries no longer in the external catalog as deprecated
    6. Generate vector embeddings for new/changed technologies
    7. Create and finalize ``core_technology_catalog_import_run`` audit record

    The audit run is created and persisted by the repository; the service holds
    it only as an opaque handle (Achse 2: ``services`` > ``repositories``).

    Returns:
        TechnologySyncResultOut with per-operation counts.

    Raises:
        CatalogSourceError: If the catalog source API is unreachable.
        Exception: On critical database errors (import_run is marked as "failed").
    """
    result = TechnologySyncResultOut()

    async with AsyncSessionLocal() as db:
        import_run = await sync_repo.start_import_run(db)

        try:
            # ── 1. Fetch catalog source data ─────────────────────────────────
            client = get_catalog_source_client()
            try:
                source_entries = await client.fetch_all_technologies()
            finally:
                await client.close()

            logger.info("Fetched %d entries from catalog source", len(source_entries))

            # ── 2. Sync loop ─────────────────────────────────────────────────
            fetch_ids = await _sync_entries(db, source_entries, result)
            await db.commit()

            # ── 3. Deprecated marking ─────────────────────────────────────────
            if fetch_ids:
                try:
                    deprecated_count = await sync_repo.mark_deprecated(db, fetch_ids)
                    result.deprecated = deprecated_count
                    if deprecated_count > 0:
                        await db.commit()
                except Exception:
                    logger.exception("Deprecated marking unavailable – skipping")
                    await db.rollback()

            # ── 4. Generate embeddings for new/changed technologies ───────────
            try:
                result.embedded = await catalog_embedding_service.embed_incremental(db)
                logger.info("Catalog embeddings updated: %d new/updated", result.embedded)
            except Exception:
                logger.exception("Embedding generation failed – sync continues")

            # ── 5. Finalize import run ────────────────────────────────────────
            await sync_repo.finalize_import_run(db, import_run, result, len(source_entries))

            logger.info(
                "Catalog sync complete: created=%d updated=%d unchanged=%d errors=%d deprecated=%d",
                result.created,
                result.updated,
                result.unchanged,
                result.errors,
                result.deprecated,
            )

        except Exception as exc:
            logger.exception("Catalog sync failed")
            await sync_repo.fail_import_run(db, import_run, exc)
            raise

    return result


async def _sync_entries(
    db: AsyncSession,
    source_entries: list[CatalogSourceTechnologyOut],
    result: TechnologySyncResultOut,
) -> set[str]:
    """Upsert all fetched catalog source entries (phase 2) and return the seen ids."""
    fetch_ids: set[str] = set()
    status_available = True  # auf False, wenn die core_status-Tabelle nicht erreichbar ist

    for entry in source_entries:
        try:
            fetch_ids.add(entry.id)

            tech_id = await sync_repo.upsert_technology(db, entry, result)
            if status_available:
                try:
                    status_name = _compute_status_name(entry)
                    await sync_repo.upsert_statusable(db, tech_id, status_name)
                except Exception:
                    logger.exception(
                        "Status update unavailable – skipping status for all entries",
                    )
                    status_available = False
            await sync_repo.ensure_icons(db, tech_id, entry)

        except Exception:
            logger.exception(
                "Error syncing catalog source entry id=%s slug=%s",
                entry.id,
                entry.slug,
            )
            result.errors += 1
            await db.rollback()

    return fetch_ids


# ── Private: mapping helpers ───────────────────────────────────────────────────


def _compute_status_name(entry: CatalogSourceTechnologyOut) -> str:
    """Determine core_status name from catalog source entry fields.

    Priority: deprecated/disabled signals FIRST, then explicit status.
    """
    if entry.deprecatedAt is not None:
        return "deprecated"
    if entry.deletedAt is not None:
        return "deprecated"
    if entry.disabled:
        return "deprecated"
    if entry.status == "approved":
        return "approved"
    if entry.status == "pending-review":
        return "pending"
    if entry.status == "rejected":
        return "rejected"
    return "pending"
