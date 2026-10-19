"""Database writers for single fields of normalised Project entries (AIScope).

Companion of :mod:`app.fbf.repositories.project_repository` (reads, filters,
status/archive). Keeps the ``set_*`` single-field writers and their shared
``_set_project_field`` core in one cohesive module; the entity lookup is reused
from the read repository.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.repositories.project_repository import _to_out, get_by_id
from app.fbf.schemas.project_schemas import ProjectOut


async def _set_project_field(
    db: AsyncSession,
    project_id: int,
    field: str,
    value: Any,
) -> ProjectOut | None:
    """Loads a project, assigns one attribute, persists and returns its DTO.

    Shared core of the single-field ``set_*`` writers: returns ``None`` when the
    project does not exist (callers translate that into a 404).

    Args:
        db: Active gjo_se_com database connection.
        project_id: Primary key.
        field: Attribute name to assign (e.g. ``"notes"``, ``"hourly_rate"``).
        value: New attribute value.

    Returns:
        The updated project DTO, or None if the project does not exist.
    """
    project = await get_by_id(db, project_id)
    if project is None:
        return None
    setattr(project, field, value)
    await db.commit()
    await db.refresh(project)
    return _to_out(project)


async def set_title_normalized(db: AsyncSession, project_id: int, title_normalized: str | None) -> ProjectOut | None:
    """Sets the curated ``title_normalized`` of a project.

    The value is the single role source for subject and body of the application
    mail; ``None`` clears it (fallback ``normalize_title(title)``).

    Args:
        db: Active gjo_se_com database connection.
        project_id: Primary key.
        title_normalized: Curated title, or None to clear.

    Returns:
        The updated Project, or None if the project does not exist.
    """
    return await _set_project_field(db, project_id, "title_normalized", title_normalized)


async def set_notes(db: AsyncSession, project_id: int, notes: str | None) -> ProjectOut | None:
    """Sets the free-text notes (Markdown source) of a project. ``None`` clears them.

    Args:
        db: Active gjo_se_com database connection.
        project_id: Primary key.
        notes: Free-text notes (Markdown source), or None to clear.

    Returns:
        The updated Project, or None if the project does not exist.
    """
    return await _set_project_field(db, project_id, "notes", notes)


async def set_hourly_rate(db: AsyncSession, project_id: int, hourly_rate: int | None) -> ProjectOut | None:
    """Sets the estimated offer hourly rate (EUR/h) of a project.

    The persisted value is the **upper bound** of the skill estimate; ``None``
    clears it.

    Args:
        db: Active gjo_se_com database connection.
        project_id: Primary key.
        hourly_rate: Estimated hourly rate in EUR/h, or None to clear.

    Returns:
        The updated Project, or None if the project does not exist.
    """
    return await _set_project_field(db, project_id, "hourly_rate", hourly_rate)


async def set_my_hourly_rate(db: AsyncSession, project_id: int, my_hourly_rate: int | None) -> ProjectOut | None:
    """Sets the own (manually curated) hourly rate (EUR/h) of a project.

    ``None`` clears it.

    Args:
        db: Active gjo_se_com database connection.
        project_id: Primary key.
        my_hourly_rate: Own hourly rate in EUR/h, or None to clear.

    Returns:
        The updated Project, or None if the project does not exist.
    """
    return await _set_project_field(db, project_id, "my_hourly_rate", my_hourly_rate)


async def set_my_start_date(db: AsyncSession, project_id: int, my_start_date: str | None) -> ProjectOut | None:
    """Sets the manual start override of a project.

    ``None`` clears it.

    Args:
        db: Active gjo_se_com database connection.
        project_id: Primary key.
        my_start_date: Manual start (``MM/YYYY``/``DD.MM.YYYY``/ignore token),
            or None to clear.

    Returns:
        The updated Project, or None if the project does not exist.
    """
    return await _set_project_field(db, project_id, "my_start_date", my_start_date)
