"""Catalog embedding service: technology vectorisation for DeterministicProcessor (Increment 5).

Provides batch and incremental embedding of ``Technology`` entries from
``core_technology_catalog`` directly onto ``Technology.vector`` (Postgres),
plus a vector-similarity search for the Stage-2 technology fallback.

Every DB access lives in ``catalog_embedding_repository`` (Achse 2:
``services`` > ``repositories``); the service orchestrates over domain records
and the embedding client.
"""

from __future__ import annotations

from datetime import datetime

import structlog

from app.shared.db_access.session_types import AsyncSession
from app.shared.embedding.domain.embedding_consumer_contract import EmbeddingClientConsumer
from app.shared.embedding.domain.similarity_rules import cosine_similarity
from app.shared.embedding.domain.text_rules import clean_str
from app.shared.embedding.infrastructure.embedding_client import EmbeddingClient
from app.shared.technology_catalog.domain.technology_catalog_contract import (
    EmbeddableTechnology,
    TechnologyEmbeddingRecord,
)
from app.shared.technology_catalog.repositories import catalog_embedding_repository

logger = structlog.get_logger(__name__)

_EMBED_BATCH_SIZE: int = 100


def build_embedding_text(tech: EmbeddableTechnology) -> str:
    """Constructs a compact, semantically meaningful text for embedding.

    Combines ``name``, ``type``, and ``description`` into a single string.
    """
    parts: list[str] = []

    name = clean_str(tech.name)
    if name:
        parts.append(f"name: {name}")

    tech_type = clean_str(tech.type)
    if tech_type:
        parts.append(f"type: {tech_type}")

    desc = clean_str(tech.description)
    if desc:
        parts.append(f"description: {desc}")

    return " ".join(parts)


class CatalogEmbeddingService(EmbeddingClientConsumer[EmbeddingClient]):
    """Embedding and vector-search service for the technology catalog.

    Wraps the existing ``EmbeddingService`` (OpenRouter
    ``text-embedding-3-small``) and persists vectors directly on
    ``core_technology_catalog.vector`` (Postgres) – no separate store.
    """

    # ── embed_all ────────────────────────────────────────────────

    async def embed_all(self, db: AsyncSession) -> int:
        """Embeds every technology whose ``vector`` is still NULL.

        Args:
            db: Async session for the gjo_se_com database.

        Returns:
            Number of newly embedded technologies (0 if none pending).
        """
        records = await catalog_embedding_repository.list_all_records(db)
        pending = [record for record in records if not record.has_vector]
        if not pending:
            logger.info("embed_all: all %d technologies already embedded.", len(records))
            return 0

        logger.info("embed_all: %d pending out of %d total.", len(pending), len(records))
        return await self._embed_pending(db, pending)

    # ── embed_incremental ────────────────────────────────────────

    async def embed_incremental(self, db: AsyncSession, since: datetime | None = None) -> int:
        """Embeds technologies that changed since the last run.

        - If ``since`` is given, only technologies with ``updated_at > since``
          and ``vector IS NULL`` are embedded.
        - If ``since`` is ``None``, only technologies whose ``vector`` is still
          NULL are embedded (catch-up mode).

        Args:
            db: Async session for the gjo_se_com database.
            since: Optional timestamp for incremental filtering.

        Returns:
            Number of newly embedded technologies.
        """
        pending = await catalog_embedding_repository.list_pending_records(db, since)
        if not pending:
            logger.info("embed_incremental: no new or changed technologies found.")
            return 0

        logger.info("embed_incremental: %d technologies to embed.", len(pending))
        return await self._embed_pending(db, pending)

    # ── search_similar ───────────────────────────────────────────

    async def search_similar(self, query: str, db: AsyncSession, top_k: int = 5) -> list[dict[str, object]]:
        """Vector-similarity search against ``core_technology_catalog.vector``.

        Embeds the query text via OpenRouter, then computes cosine similarity
        against every persisted technology vector and returns the top *k*.

        Args:
            query: Natural-language search string (e.g. ``"monitoring tool"``).
            db: Async session for the gjo_se_com database.
            top_k: Maximum number of results to return.

        Returns:
            List of dicts with keys ``technology_id``, ``name``, ``slug``,
            ``type``, ``_distance`` (cosine distance, lower = more similar).
        """
        async with catalog_embedding_repository.open_session() as core_db:
            vector = await self._embedding_service.embed_text(query, core_db)

        records = await catalog_embedding_repository.list_vector_records(db)
        ranked = sorted(
            ((record, cosine_similarity(vector, record.vector)) for record in records),
            key=lambda item: item[1],
            reverse=True,
        )

        return [
            {
                "technology_id": record.id,
                "name": record.name,
                "slug": record.slug,
                "type": record.type,
                "_distance": round(1.0 - similarity, 6),
            }
            for record, similarity in ranked[:top_k]
        ]

    # ── internal helpers ─────────────────────────────────────────

    async def _embed_pending(
        self,
        db: AsyncSession,
        pending: list[TechnologyEmbeddingRecord],
    ) -> int:
        """Embeds *pending* records in batches, persisting vectors onto the catalog.

        Uses a separate core DB session for credential lookups. Individual
        embedding failures are logged but do not abort the whole run. All
        vectors are committed in a single transaction at the end.
        """
        newly_embedded: int = 0
        total: int = len(pending)

        async with catalog_embedding_repository.open_session() as core_db:
            for batch_start in range(0, total, _EMBED_BATCH_SIZE):
                chunk = pending[batch_start : batch_start + _EMBED_BATCH_SIZE]
                texts = [build_embedding_text(record) for record in chunk]

                vectors: list[list[float]] = []
                try:
                    vectors = await self._embedding_service.embed_many(texts, core_db)
                except Exception:
                    logger.exception(
                        "Batch embedding failed for technology_ids %s – falling back to single mode.",
                        [record.id for record in chunk],
                    )

                for idx, record in enumerate(chunk):
                    if idx < len(vectors):
                        await catalog_embedding_repository.set_vector(db, record.id, vectors[idx])
                        newly_embedded += 1
                        continue
                    try:
                        vector = await self._embedding_service.embed_text(texts[idx], core_db)
                    except Exception:
                        logger.exception("Embedding failed for technology_id %s.", record.id)
                        continue
                    await catalog_embedding_repository.set_vector(db, record.id, vector)
                    newly_embedded += 1

                logger.info("Embedded %d/%d technologies...", min(newly_embedded, total), total)

        await db.commit()
        logger.info(
            "Catalog embedding complete: %d vectors persisted on core_technology_catalog.",
            newly_embedded,
        )
        return newly_embedded
