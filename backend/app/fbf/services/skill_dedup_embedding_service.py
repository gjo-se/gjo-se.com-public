"""Embedding computation for FBF skills (dedup board).

Extracted from the former monolithic ``skill_dedup_service`` (god-file split).
Owns the batch-embedding loop with a per-skill fallback for skills that fail in
a batch.
"""

from __future__ import annotations

import structlog

from app.fbf.repositories import skill_repository
from app.shared.db_access.session_types import AsyncSession
from app.shared.embedding.infrastructure.embedding_client import EmbeddingClient

logger = structlog.get_logger(__name__)


async def compute_embeddings(
    gjo_db: AsyncSession,
    core_db: AsyncSession,
    *,
    embedding_client: EmbeddingClient,
) -> int:
    """Compute embeddings for all skills without a vector.

    Args:
        gjo_db: gjo_se_com DB session (skill reads/writes).
        core_db: core DB session (OpenRouter credential lookup).
        embedding_client: Wired embedding client (composition root).

    Returns:
        Number of skills that were embedded.
    """
    embedding_service = embedding_client

    skills_without_vector = await skill_repository.get_skills_without_vector(gjo_db)

    if not skills_without_vector:
        logger.info("All skills already have embeddings.")
        return 0

    logger.info("Computing embeddings for %d skills...", len(skills_without_vector))

    chunk_size = 100
    embedded_count = 0

    for i in range(0, len(skills_without_vector), chunk_size):
        chunk = skills_without_vector[i : i + chunk_size]
        texts = [skill.name for skill in chunk]

        try:
            vectors = await embedding_service.embed_many(texts, core_db)
            for skill, vector in zip(chunk, vectors, strict=False):
                await skill_repository.set_vector(gjo_db, skill.id, vector)
                embedded_count += 1
        except Exception:
            logger.exception("Batch embedding failed for chunk %d", i)
            for skill in chunk:
                try:
                    vector = await embedding_service.embed_text(skill.name, core_db)
                    await skill_repository.set_vector(gjo_db, skill.id, vector)
                    embedded_count += 1
                except Exception:
                    logger.exception("Failed to embed skill '%s'", skill.name)

    await gjo_db.flush()
    logger.info("Embedded %d/%d skills.", embedded_count, len(skills_without_vector))
    return embedded_count
