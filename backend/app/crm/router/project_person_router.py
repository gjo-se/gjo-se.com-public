"""FastAPI router for project-crm-person junction endpoints (gjo_se_com).

Admin:
    POST   /project-crm-persons       – Link a project to a CRM person
    GET    /project-crm-persons       – List links by project or person
    DELETE /project-crm-persons/{id}  – Delete a project-crm-person link
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.schemas.project_person_schemas import (
    ProjectPersonCreate,
    ProjectPersonOut,
)
from app.crm.services import project_person_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


# ── Admin ─────────────────────────────────────────────────────────────────────


@router.post(
    "/project-crm-persons",
    response_model=ProjectPersonOut,
    status_code=status.HTTP_201_CREATED,
    summary="Link a project to a CRM person (Admin)",
)
async def create_project_crm_person(
    body: ProjectPersonCreate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ProjectPersonOut:
    """Create a project-crm-person link. Raises 409 if duplicate (project_id, crm_person_id)."""
    pp = await project_person_service.create_link(db, body)
    await db.commit()
    return ProjectPersonOut.model_validate(pp)


@router.get(
    "/project-crm-persons",
    response_model=list[ProjectPersonOut],
    summary="List project-crm-person links (Admin)",
)
async def list_project_crm_persons(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    project_id: int | None = Query(default=None, description="Filter by project ID"),
    crm_person_id: int | None = Query(default=None, description="Filter by CRM person ID"),
) -> list[ProjectPersonOut]:
    """List project-crm-person links, filtered by project_id or crm_person_id.

    Exactly one of ``project_id`` or ``crm_person_id`` must be provided.
    Returns an empty list if no links match.
    """
    if project_id is not None:
        links = await project_person_service.list_by_project(db, project_id)
    elif crm_person_id is not None:
        links = await project_person_service.list_by_person(db, crm_person_id)
    else:
        links = []
    return [ProjectPersonOut.model_validate(link) for link in links]


@router.delete(
    "/project-crm-persons/{pp_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a project-crm-person link (Admin)",
)
async def delete_project_crm_person(
    pp_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> None:
    """Delete a project-crm-person link by ID. Raises 404 if not found."""
    await project_person_service.delete_link(db, pp_id)
    await db.commit()
