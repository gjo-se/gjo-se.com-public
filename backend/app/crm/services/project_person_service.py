"""Business logic for project_person junction (gjo_se_com)."""

from __future__ import annotations

from fastapi import HTTPException, status

from app.crm.repositories import project_person_repository
from app.crm.schemas.project_person_schemas import ProjectPersonCreate, ProjectPersonOut
from app.shared.db_access.session_types import AsyncSession


async def _get_or_404(db: AsyncSession, pp_id: int) -> ProjectPersonOut:
    """Return a project-crm-person link by ID or raise 404."""
    pp = await project_person_repository.get_by_id(db, pp_id)
    if pp is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project-CRM-person link not found",
        )
    return pp


async def list_by_project(db: AsyncSession, project_id: int) -> list[ProjectPersonOut]:
    """Return all person links for a given project.

    Args:
        db: Database session.
        project_id: Project FK.

    Returns:
        List of link DTOs (may be empty).
    """
    return await project_person_repository.find_by_project(db, project_id)


async def list_by_person(db: AsyncSession, crm_person_id: int) -> list[ProjectPersonOut]:
    """Return all project links for a given CRM person.

    Args:
        db: Database session.
        crm_person_id: CRM person FK.

    Returns:
        List of link DTOs (may be empty).
    """
    return await project_person_repository.find_by_person(db, crm_person_id)


async def create_link(db: AsyncSession, data: ProjectPersonCreate) -> ProjectPersonOut:
    """Create a project-crm-person link, raising 409 on duplicate.

    Args:
        db: Database session.
        data: Validated creation payload.

    Returns:
        Persisted link DTO.

    Raises:
        HTTPException 409: A link for (project_id, crm_person_id) already exists.
    """
    existing = await project_person_repository.find_duplicate(db, data.project_id, data.crm_person_id)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(f"Link for project {data.project_id} and person {data.crm_person_id} already exists"),
        )

    return await project_person_repository.create(db, data)


async def move_links(db: AsyncSession, from_project_id: int, to_project_id: int) -> int:
    """Re-points all ``project_person`` links to another project.

    The caller owns the transaction and must commit.

    Args:
        db: Database session.
        from_project_id: Project the links currently belong to (old master).
        to_project_id: Project the links are moved to (new master).

    Returns:
        Number of links re-pointed to ``to_project_id`` (dropped duplicates are
        not counted).
    """
    return await project_person_repository.move_links(db, from_project_id, to_project_id)


async def delete_link(db: AsyncSession, pp_id: int) -> None:
    """Delete a project-crm-person link, raising 404 if not found.

    Args:
        db: Database session.
        pp_id: ID of the link to delete.

    Raises:
        HTTPException 404: Link not found.
    """
    await _get_or_404(db, pp_id)
    await project_person_repository.delete(db, pp_id)
