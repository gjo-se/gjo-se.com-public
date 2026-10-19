"""Read-model projections for project_endcustomer_candidate entries (gjo_se_com).

Companion of :mod:`app.fbf.repositories.project_endcustomer_candidate_repository`.
The candidate status lives in ``core_statusable`` (not as a column on the
model), so endpoints/activities that need the resolved status read a dedicated
projection instead of a non-column access on the ORM entity.
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project_endcustomer_candidate import (
    ProjectEndcustomerCandidate,
)
from app.shared.status.models.status import Status, Statusable


@dataclass
class ProjectEndcustomerCandidateRow:
    """Read-Model: ORM-Kandidat + per Join aufgelöster Core-Status.

    Der Kandidaten-Status liegt in ``core_statusable`` (nicht als Spalte am
    Modell). Das Read-Model trägt ``status``/``status_color_token`` explizit,
    statt einen Nicht-Spalten-Zugriff auf der ORM-Entity zu erwarten
    (ORM = Schreibmodell, Read-Model = Projektion).
    """

    candidate: ProjectEndcustomerCandidate
    status: str | None = None
    status_color_token: str | None = None


async def get_by_project_rows(db: AsyncSession, project_id: int) -> list[ProjectEndcustomerCandidateRow]:
    """Return candidate read-models (entity + resolved core status) for a project.

    Unlike :func:`get_by_project` (plain entities for ORM logic), this returns
    the core-``status`` projection the Restate activities filter on – the status
    lives in ``core_statusable``, not on the candidate model.

    Args:
        db: Database session.
        project_id: Project FK.

    Returns:
        List of ``ProjectEndcustomerCandidateRow`` ordered by ``created_at DESC``.
    """
    stmt = (
        select(
            ProjectEndcustomerCandidate,
            Status.name.label("status_name"),
            Status.color_token.label("status_color_token"),
        )
        .outerjoin(
            Statusable,
            (Statusable.statusable_type == "project_endcustomer_candidate")
            & (Statusable.statusable_id == ProjectEndcustomerCandidate.id),
        )
        .outerjoin(Status, Status.id == Statusable.status_id)
        .where(ProjectEndcustomerCandidate.project_id == project_id)
        .order_by(desc(ProjectEndcustomerCandidate.created_at))
    )
    result = await db.execute(stmt)
    return [
        ProjectEndcustomerCandidateRow(
            candidate=row[0],
            status=row[1],
            status_color_token=row[2],
        )
        for row in result.all()
    ]
