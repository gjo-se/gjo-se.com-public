"""FBF Project embedding operations: single-project wrapper and vector backfill.

The Project-aware :class:`~app.fbf.services.embedding_service.EmbeddingService`
owns the single-vector write; this module holds the orchestration around it –
the composition-root wrapper and the idempotent backfill run over all projects
whose ``vector`` is still NULL.
"""

from __future__ import annotations

import structlog

from app.fbf.repositories import project_repository
from app.fbf.schemas.project_schemas import ProjectOut
from app.fbf.services.embedding_service import EmbeddingService, build_embedding_text_for_project
from app.shared.db_access.session_types import AsyncSession
from app.shared.embedding.infrastructure.embedding_client import EmbeddingClient

logger = structlog.get_logger(__name__)

# Max texts per single OpenRouter embedding call during the backfill run
_EMBED_BATCH_SIZE: int = 20


async def embed_project(
    project: ProjectOut,
    db: AsyncSession,
    *,
    embedding_service: EmbeddingService,
) -> None:
    """Embed a single Project and persist the vector on ``project.vector``.

    Thin wrapper around :meth:`EmbeddingService.embed_project`; the caller
    provides the wired service (composition root).

    Args:
        project: The newly created Project (must have an id).
        db: Async session for the gjo_se_com database.
        embedding_service: Wired, Project-aware embedding service.
    """
    await embedding_service.embed_project(project, db)


async def backfill_project_vectors(
    db: AsyncSession,
    *,
    limit: int | None = None,
    embedding_client: EmbeddingClient,
) -> int:
    """Embed every ``Project`` whose ``vector`` is NULL into ``project.vector``.

    One-time idempotent backfill for the Postgres-vector migration: reads all
    projects with ``vector IS NULL`` from the gjo_se_com session, embeds their
    text via OpenRouter in batches of ``_EMBED_BATCH_SIZE`` and falls back to a
    single ``embed_text`` call per project when a batch fails.  Already-embedded
    projects (``vector`` set) are skipped automatically.

    Args:
        db: Async gjo_se_com session used to query ``Project`` and persist the
            ``vector`` writes.
        limit: If set, embed at most this many *new* projects before stopping
            (useful for staged validation runs).
        embedding_client: Wired, generic embedding client for the batch calls.

    Returns:
        Number of newly embedded projects.
    """
    pending = await project_repository.get_projects_without_vector(db, limit=limit)

    if not pending:
        logger.info("backfill_project_vectors: no projects without vector – nothing to do.")
        return 0

    service = embedding_client
    newly_embedded: int = 0

    async with project_repository.open_core_session() as core_db:
        for chunk_start in range(0, len(pending), _EMBED_BATCH_SIZE):
            chunk = pending[chunk_start : chunk_start + _EMBED_BATCH_SIZE]
            texts = [build_embedding_text_for_project(p) for p in chunk]

            vectors: list[list[float]] = []
            batch_ok = False
            try:
                vectors = await service.embed_many(texts, core_db)
                batch_ok = len(vectors) == len(chunk)
            except Exception:
                logger.exception(
                    "backfill_project_vectors: batch embed failed for %d projects",
                    len(chunk),
                )

            for idx, project in enumerate(chunk):
                if batch_ok:
                    await project_repository.set_vector(db, project.id, vectors[idx])
                    newly_embedded += 1
                    continue

                # Fallback: single-embedding for this project
                try:
                    vector = await service.embed_text(texts[idx], core_db)
                except Exception:
                    logger.exception(
                        "backfill_project_vectors: embed failed for project id=%d",
                        project.id,
                    )
                    continue
                await project_repository.set_vector(db, project.id, vector)
                newly_embedded += 1

    await db.commit()
    logger.info("backfill_project_vectors: embedded %d projects.", newly_embedded)
    return newly_embedded
