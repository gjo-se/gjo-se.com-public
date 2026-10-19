"""Read-side queries and API projections for AIScope projects.

Extracted from the former monolithic ``project_service`` (god-file split). Holds
only DB reads (list/count/detail/neighbours/slaves) plus the read-model →
``ProjectOut`` projection.
"""

from fastapi import HTTPException, status

from app.fbf.repositories import (
    project_repository,
    skill_repository,
)
from app.fbf.schemas.dedup_schemas import SiblingsResponse
from app.fbf.schemas.project_schemas import ProjectOut
from app.fbf.schemas.project_skill_schemas import ProjectSkillOut
from app.fbf.services.project_score_service import public_score_from_skills
from app.fbf.services.skill_service import effective_importance
from app.shared.db_access.session_types import AsyncSession


def row_to_project_out(row: project_repository.ProjectRow) -> ProjectOut:
    """Maps a repository read-model row to the API projection (``ProjectOut``).

    The projected view fields (``status``/``status_color_token``/``slave_count``/
    ``freelancermap_id``) live on the read-model, not on the ORM entity – so they
    are set explicitly here instead of via ORM runtime attributes.
    """
    out = ProjectOut.model_validate(row.project)
    out.slave_count = row.slave_count
    out.status = row.status
    out.status_color_token = row.status_color_token
    out.freelancermap_id = row.freelancermap_id
    return out


async def list_slaves(db: AsyncSession, master_id: int) -> list[ProjectOut]:
    """Returns the slave projects of a master as API projections (``ProjectOut``)."""
    rows = await project_repository.get_slaves_rows(db, master_id)
    return [row_to_project_out(row) for row in rows]


async def list_all(
    db: AsyncSession,
    filters: project_repository.ProjectFilter,
    *,
    offset: int = 0,
    limit: int = 50,
    sort_by: str = "posted_at",
    sort_order: str = "desc",
) -> list[ProjectOut]:
    """Returns paginated normalised projects.

    Args:
        db: Database connection.
        filters: Project filter parameters (search, provenance, dates, status,
            score, merged, skills, endcustomer).
        offset: Page offset.
        limit: Maximum result count.
        sort_by: Column name for sorting (default=posted_at).
        sort_order: Sort direction – ``asc`` or ``desc`` (default=desc).

    Returns:
        List of Project entries sorted by ``sort_by``/``sort_order``.
    """
    rows = await project_repository.get_all(
        db,
        filters,
        sort_by=sort_by,
        sort_order=sort_order,
        offset=offset,
        limit=limit,
    )
    return [row_to_project_out(row) for row in rows]


async def count(db: AsyncSession, filters: project_repository.ProjectFilter) -> int:
    """Returns the total number of normalised projects.

    Args:
        db: Database connection.
        filters: Project filter parameters.

    Returns:
        Number of matching projects.
    """
    return await project_repository.count(db, filters)


async def get_by_id(db: AsyncSession, project_id: int) -> ProjectOut:
    """Returns a normalised project by ID.

    Args:
        db: Database connection.
        project_id: Primary key.

    Returns:
        ProjectOut with canonical_id, similarity_score, match_score,
        confirmed_score, public_score and the linked skills
        (ordered by importance).

    Raises:
        HTTPException 404: Project not found.
    """
    row = await project_repository.get_detail(db, project_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found.",
        )

    skills = await skill_repository.get_scored_skills(db, project_id)
    project_out = row_to_project_out(row)
    # Public score: derived on the fly (not persisted) – active skills only,
    # weighted by level_public.
    public_score = public_score_from_skills(skills)
    project_out.public_score = float(public_score) if public_score is not None else None
    project_out.skills = [
        ProjectSkillOut(
            id=skill.id,
            name=skill.name,
            effective_importance=effective_importance(skill, project_imp, avg_imp),
            level=skill.level,
            level_public=skill.level_public,
            status=status_name,
        )
        for skill, project_imp, avg_imp, status_name in skills
    ]
    return project_out


async def get_neighbors(
    db: AsyncSession,
    project_id: int,
    filters: project_repository.ProjectFilter,
    *,
    sort_by: str = "posted_at",
    sort_order: str = "desc",
) -> SiblingsResponse:
    """Returns the previous/next project ids for the same filtered, sorted view.

    Args:
        db: Database connection.
        project_id: Anchor project whose neighbours are requested.
        filters: Project filter parameters (must match the list view).
        sort_by: Column name for sorting (default=posted_at).
        sort_order: Sort direction – ``asc`` or ``desc`` (default=desc).

    Returns:
        SiblingsResponse with prev_id/next_id (None at the boundaries).

    Raises:
        HTTPException 404: Project not found.
    """
    if not await project_repository.exists(db, project_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found.",
        )

    prev_id, next_id = await project_repository.get_neighbors(
        db,
        project_id,
        filters,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return SiblingsResponse(prev_id=prev_id, next_id=next_id)
