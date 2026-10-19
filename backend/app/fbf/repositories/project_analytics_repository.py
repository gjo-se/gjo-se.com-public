"""Read-only analytics for project entries (AIScope domain).

Owns the monthly volume aggregation and the look-back score projection used by
the impact simulation. Split out of ``project_repository`` so that module stays
cohesive (LCOM4); the master-vector projection lives in
``project_vector_repository``.
"""

from __future__ import annotations

import datetime
from dataclasses import dataclass

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project import Project


@dataclass(frozen=True)
class MonthlyProjectRow:
    """Read DTO: one calendar month of project volume (total vs. matching).

    Service-boundary type for the monthly volume chart so the service never
    touches the ORM ``Project`` model.
    """

    month: str
    total: int
    matching: int


async def get_monthly_project_counts(
    db: AsyncSession,
    threshold: float,
) -> list[MonthlyProjectRow]:
    """Return monthly project volume: total vs. matching (``confirmed_score`` >= threshold).

    Groups all master projects with a ``posted_at`` by calendar month (ascending)
    and counts how many reach the match threshold.

    Args:
        db: Active gjo_se_com database connection.
        threshold: Match-score threshold (0–100).

    Returns:
        One :class:`MonthlyProjectRow` per month, sorted by month ASC.
    """
    month_trunc = func.date_trunc("month", Project.posted_at)
    stmt = (
        select(
            month_trunc.label("month"),
            func.count(Project.id).label("total"),
            func.sum(case((Project.confirmed_score >= threshold, 1), else_=0)).label("matching"),
        )
        .where(
            Project.canonical_id.is_(None),
            Project.posted_at.isnot(None),
        )
        .group_by(month_trunc)
        .order_by(month_trunc)
    )
    result = await db.execute(stmt)
    return [
        MonthlyProjectRow(
            month=row.month.strftime("%Y-%m") if row.month else "?",
            total=row.total,
            matching=row.matching,
        )
        for row in result.all()
    ]


async def get_master_confirmed_scores_since(
    db: AsyncSession,
    cutoff: datetime.datetime,
) -> dict[int, float]:
    """Return ``project_id -> confirmed_score`` for masters posted since a cutoff.

    Serves the impact simulation, which scopes match counts to master projects
    posted within the look-back window. Masters without a confirmed score are
    omitted.

    Args:
        db: Active gjo_se_com database connection.
        cutoff: Lower bound (inclusive) on ``posted_at``.

    Returns:
        Mapping of master project id to confirmed score (0–100).
    """
    result = await db.execute(
        select(Project.id, Project.confirmed_score).where(
            Project.canonical_id.is_(None),
            Project.posted_at.isnot(None),
            Project.posted_at >= cutoff,
        )
    )
    return {project_id: float(score) for project_id, score in result.all() if score is not None}
