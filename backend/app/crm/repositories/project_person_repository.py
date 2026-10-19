"""Database access for project_person junction entries (gjo_se_com).

Read/write operations return ``ProjectPersonOut`` DTOs (never ORM models) so the
service layer stays free of ``app.crm.models`` imports (Achse-2: ``services`` >
``repositories``).
"""

from functools import partial

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.models.project_person import ProjectPerson

# Re-export: the conflict-free move owner lives in
# ``project_person_move_repository``; exposed here so callers keep a single
# repository collaborator.
from app.crm.repositories.project_person_move_repository import move_links
from app.crm.schemas.project_person_schemas import ProjectPersonCreate, ProjectPersonOut
from app.shared.db_access import repository_helpers

__all__ = [
    "create",
    "delete",
    "find_by_person",
    "find_by_project",
    "find_duplicate",
    "get_by_id",
    "move_links",
]


_to_out = partial(repository_helpers.to_out, dto_cls=ProjectPersonOut)


get_by_id = partial(repository_helpers.get_by_id, model=ProjectPerson, dto_cls=ProjectPersonOut)


async def find_by_project(db: AsyncSession, project_id: int) -> list[ProjectPersonOut]:
    """Return all person links for a given project as DTOs.

    Args:
        db: Database session.
        project_id: Project FK (integer).

    Returns:
        List of link DTOs (may be empty).
    """
    result = await db.execute(select(ProjectPerson).where(ProjectPerson.project_id == project_id))
    return [_to_out(pp) for pp in result.scalars().all()]


async def find_by_person(db: AsyncSession, crm_person_id: int) -> list[ProjectPersonOut]:
    """Return all project links for a given CRM person as DTOs.

    Args:
        db: Database session.
        crm_person_id: CRM person FK.

    Returns:
        List of link DTOs (may be empty).
    """
    result = await db.execute(select(ProjectPerson).where(ProjectPerson.crm_person_id == crm_person_id))
    return [_to_out(pp) for pp in result.scalars().all()]


async def find_duplicate(db: AsyncSession, project_id: int, crm_person_id: int) -> ProjectPersonOut | None:
    """Check if a link already exists for (project_id, crm_person_id).

    Args:
        db: Database session.
        project_id: Project FK.
        crm_person_id: CRM person FK.

    Returns:
        Existing link DTO or ``None``.
    """
    result = await db.execute(
        select(ProjectPerson).where(
            ProjectPerson.project_id == project_id,
            ProjectPerson.crm_person_id == crm_person_id,
        )
    )
    pp = result.scalar_one_or_none()
    return _to_out(pp) if pp is not None else None


async def create(db: AsyncSession, data: ProjectPersonCreate) -> ProjectPersonOut:
    """Builds and persists a new project-crm-person link, returning its DTO.

    Args:
        db: Database session.
        data: Validated creation payload.

    Returns:
        Persisted link as DTO.
    """
    pp = ProjectPerson(
        project_id=data.project_id,
        crm_person_id=data.crm_person_id,
        label=data.label,
    )
    db.add(pp)
    await db.flush()
    await db.refresh(pp)
    return _to_out(pp)


delete = partial(repository_helpers.delete, model=ProjectPerson)
