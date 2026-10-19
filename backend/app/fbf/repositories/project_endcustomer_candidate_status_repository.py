"""Status mutation for project_endcustomer_candidate entries (gjo_se_com).

Owns the core_statusable status transition. Split out of
``project_endcustomer_candidate_repository`` so that module stays cohesive
(LCOM4): the status path uses the status repositories as collaborator, the read
path does not.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project_endcustomer_candidate import (
    ProjectEndcustomerCandidate,
)


async def update_status(db: AsyncSession, candidate_id: int, status: str) -> ProjectEndcustomerCandidate | None:
    """Update the status of a candidate via core_statusable.

    Args:
        db: Database session.
        candidate_id: Candidate primary key.
        status: New status value (pending/accepted/rejected).

    Returns:
        Updated ``ProjectEndcustomerCandidate`` or ``None`` if not found.
    """
    from app.shared.status.repositories import status_repository, statusable_repository

    candidate = await db.get(ProjectEndcustomerCandidate, candidate_id)
    if candidate is None:
        return None
    status_obj = await status_repository.get_by_name_and_category(db, status, "project_endcustomer_candidate")
    if status_obj:
        await statusable_repository.set_status(db, "project_endcustomer_candidate", candidate_id, status_obj.id)
    await db.commit()
    await db.refresh(candidate)
    return candidate
