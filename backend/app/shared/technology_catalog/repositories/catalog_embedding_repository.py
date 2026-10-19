"""Database access for catalog embedding/vector search (shared technology_catalog).

Holds the ``Technology`` queries, vector persistence and the isolated session
factory for the embedding client's credential lookups. Extracted from
``catalog_embedding_service`` so the service stays query-free (Achse 2:
``services`` > ``repositories``; K1/K2/K3). Read functions return domain records.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access import session as _db_session
from app.shared.technology_catalog.domain.technology_catalog_contract import (
    TechnologyEmbeddingRecord,
    TechnologyVectorRecord,
)
from app.shared.technology_catalog.models.technology import Technology

open_session = _db_session.open_session


def _to_embedding_record(tech: Technology) -> TechnologyEmbeddingRecord:
    """Maps a Technology ORM row to its embedding record."""
    return TechnologyEmbeddingRecord(
        id=tech.id,
        has_vector=tech.vector is not None,
        name=tech.name,
        type=tech.type,
        description=tech.description,
    )


async def list_all_records(db: AsyncSession) -> list[TechnologyEmbeddingRecord]:
    """Returns every technology as an embedding record, ordered by id."""
    result = await db.execute(select(Technology).order_by(Technology.id))
    return [_to_embedding_record(tech) for tech in result.scalars().all()]


async def list_pending_records(db: AsyncSession, since: datetime | None = None) -> list[TechnologyEmbeddingRecord]:
    """Returns technologies without a vector, optionally only those changed since *since*."""
    stmt = select(Technology).where(Technology.vector.is_(None))
    if since is not None:
        stmt = stmt.where(Technology.updated_at > since)
    stmt = stmt.order_by(Technology.id)
    result = await db.execute(stmt)
    return [_to_embedding_record(tech) for tech in result.scalars().all()]


async def list_vector_records(db: AsyncSession) -> list[TechnologyVectorRecord]:
    """Returns all technologies that already carry a vector, ordered deterministically."""
    result = await db.execute(select(Technology).where(Technology.vector.isnot(None)).order_by(Technology.id))
    records: list[TechnologyVectorRecord] = []
    for tech in result.scalars().all():
        if tech.vector is None:
            continue
        records.append(
            TechnologyVectorRecord(
                id=tech.id,
                name=tech.name,
                slug=tech.slug,
                type=tech.type,
                vector=tech.vector,
            )
        )
    return records


async def set_vector(db: AsyncSession, technology_id: int, vector: list[float]) -> None:
    """Persists ``vector`` on the technology (no commit; caller orchestrates the unit of work)."""
    tech = await db.get(Technology, technology_id)
    if tech is not None:
        tech.vector = vector
