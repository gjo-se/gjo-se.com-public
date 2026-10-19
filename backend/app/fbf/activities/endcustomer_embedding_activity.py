"""Restate activity – Act 6: Embedding + Vector Similarity.

Embeddet den Text aus ``candidate.career_page_description`` via
``EmbeddingService.embed_text()`` und berechnet die Cosine-Similarity
gegen das Projekt-Embedding in ``project.vector`` (Postgres). Persistiert
den Score in ``candidate.similarity_to_project``.

Three-phase approach (MergeActivity-Pattern):
1. Fetch – GjoDB: Lade Candidates mit ``career_page_description IS NOT NULL``.
2. Embed – CoreDB: ``EmbeddingService.embed_text()`` → Vector → Cosine vs. ``project.vector``.
3. Persist – GjoDB: Schreibe ``similarity_to_project``.
"""

from __future__ import annotations

from typing import Any

import structlog
from restate import Context, Service
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project import Project
from app.fbf.models.project_endcustomer_candidate import ProjectEndcustomerCandidate
from app.fbf.repositories import project_endcustomer_candidate_read_repository as candidate_read_repo
from app.fbf.repositories import project_endcustomer_candidate_repository as repo
from app.shared.db_access.session import AsyncSessionLocal as CoreDB
from app.shared.db_access.session import AsyncSessionLocal as GjoDB
from app.shared.embedding.dependencies.embedding_dependencies import get_embedding_client
from app.shared.embedding.domain.similarity_rules import cosine_similarity
from app.shared.embedding.infrastructure.embedding_client import EmbeddingClient

logger = structlog.get_logger(__name__)

# text-embedding-3-small has a max input of 8192 tokens.
# Conservatively estimate 3 chars per token → ~24000 chars.
_MAX_EMBED_CHARS = 24_000

endcustomer_embedding_service = Service("EndcustomerEmbeddingActivity")


async def _load_master_vectors() -> list[list[float]]:
    """Load the master-project vectors once for the cosine search space.

    Returns:
        The non-null master-project vectors, or an empty list when there are none.
    """
    async with GjoDB() as gjo_db:
        result = await gjo_db.execute(
            select(Project.vector).where(
                Project.canonical_id.is_(None),
                Project.vector.isnot(None),
            )
        )
        return [vec for vec in result.scalars().all() if vec]


def _nearest_similarity(vector: list[float], master_vectors: list[list[float]]) -> float | None:
    """Return the clamped similarity to the nearest master vector.

    Args:
        vector: The candidate embedding vector.
        master_vectors: Master-project vectors (cosine search space).

    Returns:
        The best similarity clamped to ``[0.0, 1.0]``, or ``None`` when there are
        no master vectors to compare against.
    """
    if not master_vectors:
        return None
    best = max((cosine_similarity(vector, master) for master in master_vectors), default=0.0)
    return max(0.0, min(1.0, best))


async def _embed_candidate(
    candidate: ProjectEndcustomerCandidate,
    embedding_service: EmbeddingClient,
    core_db: AsyncSession,
) -> list[float] | None:
    """Embed the candidate's career-page text (truncated to the token budget).

    Args:
        candidate: Candidate carrying ``career_page_description``.
        embedding_service: Injected embedding client.
        core_db: CoreDB session used by the embedding client.

    Returns:
        The embedding vector, or ``None`` when the candidate has no text.
    """
    text = candidate.career_page_description
    if not text:
        return None
    if len(text) > _MAX_EMBED_CHARS:
        text = text[:_MAX_EMBED_CHARS]
    return await embedding_service.embed_text(text, core_db)


async def _embed_pending_candidates(
    candidates: list[ProjectEndcustomerCandidate],
    embedding_service: EmbeddingClient,
    core_db: AsyncSession,
    master_vectors: list[list[float]],
) -> int:
    """Embed each candidate, score it and persist the similarity.

    Args:
        candidates: Candidates with a career-page text to embed.
        embedding_service: Injected embedding client.
        core_db: CoreDB session used by the embedding client.
        master_vectors: Master-project vectors (cosine search space).

    Returns:
        The number of candidates embedded and persisted.
    """
    embedded = 0
    for candidate in candidates:
        try:
            vector = await _embed_candidate(candidate, embedding_service, core_db)
        except Exception:
            logger.exception("Act 6: embedding failed for candidate %d", candidate.id)
            continue
        if vector is None:
            continue

        score = _nearest_similarity(vector, master_vectors)
        async with GjoDB() as gjo_db:
            await repo.update_fields(gjo_db, candidate.id, similarity_to_project=score)
        embedded += 1

        logger.debug(
            "Act 6: candidate %d similarity=%s",
            candidate.id,
            f"{score:.3f}" if score is not None else "None",
        )
    return embedded


@endcustomer_embedding_service.handler()
async def run(ctx: Context, arg: dict[str, Any]) -> dict[str, Any]:
    """Embed career page texts and compute vector similarity to project.

    Args:
        ctx: Restate workflow context.
        arg: Dict with ``project_id`` (int) and optional ``trigger`` (str).

    Returns:
        Dict with ``project_id`` and ``embedded`` (int).
    """
    project_id: int = arg["project_id"]

    # ── Phase 1: Fetch candidates (short-lived GjoDB session) ─────────────
    async with GjoDB() as gjo_db:
        rows = await candidate_read_repo.get_by_project_rows(gjo_db, project_id)

    # Filter: only pending candidates with a career_page_description
    to_embed = [row.candidate for row in rows if row.status == "pending" and row.candidate.career_page_description]

    if not to_embed:
        logger.info("Act 6: no pending candidates with career_page_description for project %d", project_id)
        return {"project_id": project_id, "embedded": 0}

    master_vectors = await _load_master_vectors()
    embedding_service = get_embedding_client()

    # ── Phase 2: Embed + Vector Similarity (CoreDB + Postgres-Cosine) ──────
    async with CoreDB() as core_db:
        embedded = await _embed_pending_candidates(to_embed, embedding_service, core_db, master_vectors)

    logger.info("Act 6: project_id=%d embedded=%d", project_id, embedded)
    return {"project_id": project_id, "embedded": embedded}
