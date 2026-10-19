"""Read-only master-project vector projection (AIScope domain).

Owns the dedup/Cousin search-space loading: the canonical (master) projects
that carry an embedding vector. Split out of ``project_analytics_repository``
so each module has one responsibility (LCOM4): vector refs vs. monthly volume
aggregation.
"""

from __future__ import annotations

import datetime
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project import Project


@dataclass
class ProjectVectorRef:
    """Read DTO: a master project carrying its embedding vector.

    Used by the dedup/Cousin search space so the service layer never imports the
    ORM ``Project`` model.
    """

    id: int
    title: str
    city: str | None
    posted_at: datetime.datetime | None
    vector: list[float] | None


async def get_master_vector_refs(db: AsyncSession) -> list[ProjectVectorRef]:
    """Return all master projects carrying an embedding vector.

    The dedup/Cousin search space is the set of canonical (master) projects with
    ``vector IS NOT NULL`` – mirrors the former LanceDB content.

    Args:
        db: Active gjo_se_com database connection.

    Returns:
        ``ProjectVectorRef`` DTOs for the in-memory similarity ranking.
    """
    result = await db.execute(
        select(Project).where(
            Project.canonical_id.is_(None),
            Project.vector.isnot(None),
        )
    )
    return [
        ProjectVectorRef(
            id=project.id,
            title=project.title,
            city=project.city,
            posted_at=project.posted_at,
            vector=project.vector,
        )
        for project in result.scalars().all()
    ]
