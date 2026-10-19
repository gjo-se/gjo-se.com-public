"""Status transitions for normalised Project entries (AIScope domain).

Owns the core-status write (``set_status``) and the stale-archive sweep that
transition projects through ``core_statusable``. Split out of
``project_repository`` (God-File-Refactor); the plain field writers live in
``project_mutation_repository``.
"""

from __future__ import annotations

import datetime
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project import Project
from app.fbf.repositories.project_read_model_repository import ProjectRow
from app.fbf.repositories.project_read_repository import get_detail
from app.shared.status.models.status import Status, Statusable
from app.shared.status.repositories import status_repository, statusable_repository

ARCHIVE_AGE_DAYS = 30


async def set_status(db: AsyncSession, project_id: int, status: str) -> ProjectRow | None:
    """Sets the exclusive status of a project via core_statusable.

    Args:
        db: Active gjo_se_com database connection.
        project_id: Primary key.
        status: New status value (e.g. ``new``, ``favorite``, ``applied``, ``archived``).

    Returns:
        Read-model ``ProjectRow`` (entity + re-resolved status/color), or None.
    """
    detail = await get_detail(db, project_id)
    if detail is None:
        return None
    project = detail.project
    status_obj = await status_repository.get_by_name_and_category(db, status, "project")
    if status_obj:
        await statusable_repository.set_status(db, "project", project_id, status_obj.id)
    await db.commit()
    return ProjectRow(
        project=project,
        status=status_obj.name if status_obj else None,
        status_color_token=status_obj.color_token if status_obj else None,
        freelancermap_id=detail.freelancermap_id,
    )


async def archive_stale_projects(db: AsyncSession, older_than_days: int = ARCHIVE_AGE_DAYS) -> int:
    """Archives stale ``new`` projects via core_statusable.

    Transitions projects with status ``new`` whose ``posted_at`` is older than
    ``older_than_days`` to ``archived``. Manually curated statuses
    (``favorite``/``applied``/``archived``) are never touched; projects without a
    ``posted_at`` remain unchanged.

    Args:
        db: Active gjo_se_com database connection.
        older_than_days: Age threshold in days, measured against ``posted_at``.

    Returns:
        Number of rows transitioned to ``archived``.
    """
    cutoff = datetime.datetime.now(datetime.UTC) - timedelta(days=older_than_days)

    # Find stale projects: posted_at < cutoff, with status "new"
    new_subq = (
        select(Statusable.statusable_id)
        .join(Status, Status.id == Statusable.status_id)
        .where(
            Statusable.statusable_type == "project",
            Status.category == "project",
            Status.name == "new",
        )
    ).scalar_subquery()

    archived_status = await status_repository.get_by_name_and_category(db, "archived", "project")
    if archived_status is None:
        return 0

    stale_stmt = select(Project.id).where(
        Project.id.in_(new_subq),
        Project.posted_at.is_not(None),
        Project.posted_at < cutoff,
    )
    result = await db.execute(stale_stmt)
    stale_ids = [row[0] for row in result.all()]

    count = 0
    for project_id in stale_ids:
        await statusable_repository.set_status(db, "project", project_id, archived_status.id)
        count += 1

    if count:
        await db.commit()
    return count
