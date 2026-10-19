"""Write-side mutations for AIScope projects.

Extracted from the former monolithic ``project_service`` (god-file split). Holds
the mutating operations (create/delete/status transitions/archive sweep).
"""

import structlog
from fastapi import HTTPException, status

from app.fbf.repositories import project_repository
from app.fbf.schemas.project_schemas import ProjectCreate, ProjectOut
from app.fbf.services.project_query_service import row_to_project_out
from app.shared.db_access.session_types import AsyncSession
from app.shared.status.repositories import status_repository, statusable_repository

logger = structlog.get_logger(__name__)


async def create(db: AsyncSession, data: ProjectCreate) -> ProjectOut:
    """Creates a new master project from the given input data.

    Guards the globally unique ``url`` (409 on duplicate), persists the project
    as a master (``canonical_id = None``, ``similarity_score = 1.0``) and assigns
    the default status ``new`` via ``core_statusable`` – mirroring the mapper.

    Args:
        db: Database connection.
        data: Validated project input.

    Returns:
        The created ProjectOut.

    Raises:
        HTTPException 409: A project with the same url already exists.
    """
    existing = await project_repository.get_by_url_out(db, data.url)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Project url already exists",
        )

    fields = data.model_dump(exclude={"url", "title"})
    project_out = await project_repository.create_master(db, url=data.url, title=data.title, fields=fields)

    # Default-Status "new" (analog Mapper)
    status_obj = await status_repository.get_by_name_and_category(db, "new", "project")
    if status_obj is not None:
        await statusable_repository.set_status(db, "project", project_out.id, status_obj.id)

    await db.commit()

    logger.info("Project created: id=%s url=%s", project_out.id, project_out.url)
    return project_out


async def delete(db: AsyncSession, project_id: int) -> None:
    """Permanently deletes a normalised project including all junction entries.

    Args:
        db: Database connection.
        project_id: Primary key.

    Raises:
        HTTPException 404: Project not found.
    """
    if not await project_repository.exists(db, project_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found.",
        )
    await project_repository.delete_by_id(db, project_id)
    logger.info("Project deleted: id=%s", project_id)


async def set_status(db: AsyncSession, project_id: int, new_status: str) -> ProjectOut:
    """Sets the exclusive status of a project.

    Args:
        db: Database connection.
        project_id: Primary key.
        new_status: New status value (validated ``ProjectStatus``).

    Returns:
        Updated ProjectOut.

    Raises:
        HTTPException 404: Project not found.
    """
    row = await project_repository.set_status(db, project_id, new_status)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found.",
        )
    logger.info("Project status set: id=%s status=%s", project_id, new_status)
    return row_to_project_out(row)


async def clear_status(db: AsyncSession, project_id: int) -> None:
    """Removes the exclusive project status so the project becomes status-free.

    Project status is modelled polymorphically via ``core_statusable``
    (``statusable_type='project'``): the absence of a junction row already means
    "no status" – a dedicated ``none`` status is therefore unnecessary. A
    degraded master must be status-free (slaves carry no status by convention),
    so this deletes the junction row instead of falling back to ``new``.

    The caller owns the transaction and must commit.

    Args:
        db: gjo_se_com database session.
        project_id: Primary key of the project whose status is cleared.
    """
    await statusable_repository.clear_status(db, "project", project_id)
    logger.info("Project status cleared: id=%s", project_id)


async def move_status(db: AsyncSession, from_project_id: int, to_project_id: int) -> bool:
    """Moves the project status from one master to another.

    Reads the (single) status of ``from_project_id``, assigns the same status to
    ``to_project_id`` and makes the source status-free via :func:`clear_status`.
    When the source has no status, the target is left unchanged.

    The caller owns the transaction and must commit.

    Args:
        db: gjo_se_com database session.
        from_project_id: Project whose status is taken (the degraded master).
        to_project_id: Project that receives the status (the new master).

    Returns:
        ``True`` when a status was moved, ``False`` when the source had none.
    """
    row = await statusable_repository.get_status(db, "project", from_project_id)
    if row is None:
        return False
    await statusable_repository.set_status(db, "project", to_project_id, row.status_id)
    await clear_status(db, from_project_id)
    logger.info(
        "Project status moved: from=%s to=%s status_id=%s",
        from_project_id,
        to_project_id,
        row.status_id,
    )
    return True


async def archive_stale_projects(
    db: AsyncSession,
    older_than_days: int = project_repository.ARCHIVE_AGE_DAYS,
) -> int:
    """Archives stale open projects and logs the resulting count.

    Args:
        db: Database connection.
        older_than_days: Age threshold in days, measured against ``posted_at``.

    Returns:
        Number of projects transitioned to ``archived``.
    """
    archived = await project_repository.archive_stale_projects(db, older_than_days=older_than_days)
    logger.info("Auto-archive sweep: %d project(s) archived (older than %d days)", archived, older_than_days)
    return archived
