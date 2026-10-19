"""Single-field write use-cases for normalised Project entries (AIScope domain).

Keeps the ``set_*`` update use-cases (title, notes, hourly rates, manual start)
in one cohesive module. The persistence lives in
:mod:`app.fbf.repositories.project_write_repository`; this module turns a
missing project into a 404 and projects the result to ``ProjectOut``.
"""

from __future__ import annotations

import structlog
from fastapi import HTTPException, status

from app.fbf.repositories import project_write_repository
from app.fbf.schemas.project_schemas import ProjectOut
from app.shared.db_access.session_types import AsyncSession

logger = structlog.get_logger(__name__)


def _project_out_or_404(project: ProjectOut | None, project_id: int) -> ProjectOut:
    """Returns the project DTO, raising 404 when it does not exist.

    Shared core of the ``set_*`` writers: the repository already projects the
    ``ProjectOut``, so callers only translate the missing case into an HTTP error.

    Args:
        project: Project DTO, or ``None`` when it does not exist.
        project_id: Primary key (used in the 404 detail).

    Returns:
        The API projection of ``project``.

    Raises:
        HTTPException 404: When ``project`` is ``None``.
    """
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found.",
        )
    return project


async def set_title_normalized(db: AsyncSession, project_id: int, title_normalized: str | None) -> ProjectOut:
    """Sets the curated ``title_normalized`` (role source for the application mail).

    The value is the single source for subject and body (opener) of the
    application mail; an empty/``None`` value clears it so the render falls back
    to ``normalize_title(title)``.

    Args:
        db: Database connection.
        project_id: Primary key.
        title_normalized: Curated title, or None to clear the override.

    Returns:
        Updated ProjectOut.

    Raises:
        HTTPException 404: Project not found.
    """
    cleaned = title_normalized.strip() if title_normalized is not None else None
    project = await project_write_repository.set_title_normalized(db, project_id, cleaned or None)
    project_out = _project_out_or_404(project, project_id)
    logger.info("Project title_normalized set: id=%s", project_id)
    return project_out


async def set_notes(db: AsyncSession, project_id: int, notes: str | None) -> ProjectOut:
    """Sets the free-text notes (Markdown source) of a project.

    The raw Markdown is stored verbatim and passed through unchanged (no
    server-side parsing or escaping); an empty/``None`` value clears it so the
    column becomes ``NULL``.

    Args:
        db: Database connection.
        project_id: Primary key.
        notes: Free-text notes (Markdown source), or None to clear.

    Returns:
        Updated ProjectOut.

    Raises:
        HTTPException 404: Project not found.
    """
    cleaned = notes.strip() if notes is not None else None
    project = await project_write_repository.set_notes(db, project_id, cleaned or None)
    project_out = _project_out_or_404(project, project_id)
    logger.info("Project notes set: id=%s", project_id)
    return project_out


async def set_hourly_rate(db: AsyncSession, project_id: int, hourly_rate: int | None) -> ProjectOut:
    """Sets the estimated offer hourly rate (EUR/h) of a project.

    The value is the upper bound of the skill estimate; ``None`` clears it
    (project becomes "not estimated").

    Args:
        db: Database connection.
        project_id: Primary key.
        hourly_rate: Estimated hourly rate in EUR/h, or None to clear.

    Returns:
        Updated ProjectOut.

    Raises:
        HTTPException 404: Project not found.
    """
    project = await project_write_repository.set_hourly_rate(db, project_id, hourly_rate)
    project_out = _project_out_or_404(project, project_id)
    logger.info("Project hourly_rate set: id=%s", project_id)
    return project_out


async def set_my_hourly_rate(db: AsyncSession, project_id: int, my_hourly_rate: int | None) -> ProjectOut:
    """Sets the own (manually curated) hourly rate (EUR/h) of a project.

    ``None`` clears it (no own rate set).

    Args:
        db: Database connection.
        project_id: Primary key.
        my_hourly_rate: Own hourly rate in EUR/h, or None to clear.

    Returns:
        Updated ProjectOut.

    Raises:
        HTTPException 404: Project not found.
    """
    project = await project_write_repository.set_my_hourly_rate(db, project_id, my_hourly_rate)
    project_out = _project_out_or_404(project, project_id)
    logger.info("Project my_hourly_rate set: id=%s", project_id)
    return project_out


async def set_my_start_date(db: AsyncSession, project_id: int, my_start_date: str | None) -> ProjectOut:
    """Sets the manual start override of a project.

    ``None`` clears it (no override, resolver falls back to text/field).

    Args:
        db: Database connection.
        project_id: Primary key.
        my_start_date: Manual start (``MM/YYYY``/``DD.MM.YYYY``/ignore token),
            or None to clear.

    Returns:
        Updated ProjectOut.

    Raises:
        HTTPException 404: Project not found.
    """
    project = await project_write_repository.set_my_start_date(db, project_id, my_start_date)
    project_out = _project_out_or_404(project, project_id)
    logger.info("Project my_start_date set: id=%s", project_id)
    return project_out
