"""Current-flag management for application submissions (gjo_se_com).

Owns the promote / re-point status transitions. Split out of
``submission_repository`` so that module stays cohesive (LCOM4): the
current-flag path shares no collaborator with the single-record reads.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.models.submission import Submission


async def set_current(db: AsyncSession, submission_id: int) -> None:
    """Marks the submission as its project's current one and demotes the others.

    Args:
        db: Active async DB session.
        submission_id: The submission to promote to current.
    """
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = result.scalar_one_or_none()
    if submission is None:
        return
    await db.execute(
        sa_update(Submission)
        .where(
            Submission.project_id == submission.project_id,
            Submission.id != submission.id,
        )
        .values(is_current=False)
    )
    submission.is_current = True
    await db.flush()


async def move_current(db: AsyncSession, submission_id: int, to_project_id: int) -> bool:
    """Re-points a submission to ``to_project_id`` and marks it current there.

    Returns:
        ``True`` when a submission was moved, ``False`` when it does not exist.
    """
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = result.scalar_one_or_none()
    if submission is None:
        return False
    submission.project_id = to_project_id
    await db.flush()
    await set_current(db, submission_id)
    return True
