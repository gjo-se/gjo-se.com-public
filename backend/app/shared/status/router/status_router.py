"""FastAPI router for Status and Statusable endpoints (gjo_se_com).

Admin (mounted under /api/v1/admin/status via router.py):
    GET    /                                             – List all statuses
    POST   /                                             – Create status
    PATCH  /{status_id}                                  – Update status
    DELETE /{status_id}                                  – Delete status
    GET    /statusable/{statusable_type}/{statusable_id} – Get status for entity
    PUT    /statusable/{statusable_type}/{statusable_id} – Set status for entity
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser
from app.shared.status.schemas.status_schemas import StatusCreate, StatusOut, StatusUpdate
from app.shared.status.schemas.statusable_schemas import StatusableAssignIn, StatusableOut
from app.shared.status.services import status_service
from app.shared.tagging.domain.tagging_rules import StatusableType

router = APIRouter(prefix="/status", tags=["status · status · admin"])


@router.get(
    "",
    response_model=list[StatusOut],
    summary="Alle Status auflisten (Admin)",
)
async def list_statuses(
    _: AdminUser,
    category: str | None = Query(default=None),
    statusable_type: str | None = Query(default=None),
    slug: str | None = Query(default=None),
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[StatusOut]:
    """Returns all statuses sorted by category, sort_order, name.

    Filters:
    - ``category``: exact match on Status.category.
    - ``slug``: exact match on Status.slug.
    - ``statusable_type``: scope filter – only statuses whose scope includes this type.
    """
    status_tuples = await status_service.list_statuses(
        db,
        category=category,
        statusable_type=statusable_type,
        slug=slug,
    )
    return [StatusOut.model_validate(s).model_copy(update={"usage_count": count}) for s, count in status_tuples]


@router.post(
    "",
    response_model=StatusOut,
    status_code=status.HTTP_201_CREATED,
    summary="Status anlegen (Admin)",
)
async def create_status(
    body: StatusCreate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> StatusOut:
    """Creates a new status. Fails with 400 on invalid color_token, 409 on duplicate (name, category)."""
    status_obj = await status_service.create_status(db, **body.model_dump())
    await db.commit()
    return StatusOut.model_validate(status_obj)


@router.patch(
    "/{status_id}",
    response_model=StatusOut,
    summary="Status bearbeiten (Admin)",
)
async def update_status(
    status_id: int,
    body: StatusUpdate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> StatusOut:
    """Partially updates a status. Only non-None fields are applied."""
    status_obj = await status_service.update_status(db, status_id=status_id, **body.model_dump())
    await db.commit()
    return StatusOut.model_validate(status_obj)


@router.delete(
    "/{status_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Status löschen (Admin)",
)
async def delete_status(
    status_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> None:
    """Deletes a status. Fails with 404 if not found, 409 if still in use."""
    await status_service.delete_status(db, status_id)
    await db.commit()


@router.get(
    "/statusable/{statusable_type}/{statusable_id}",
    response_model=StatusableOut | None,
    summary="Status einer Entität lesen (Admin)",
)
async def get_statusable_status(
    statusable_type: str,
    statusable_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> StatusableOut | None:
    """Returns the status assignment with metadata for the given entity, or null."""
    assignment = await status_service.get_status(db, statusable_type, statusable_id)
    if assignment is None:
        return None
    return StatusableOut(
        status_id=assignment.status_id,
        statusable_type=assignment.statusable_type,
        statusable_id=assignment.statusable_id,
        status_name=assignment.status.name,
        status_category=assignment.status.category,
        status_color_token=assignment.status.color_token,
    )


@router.put(
    "/statusable/{statusable_type}/{statusable_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Status einer Entität setzen (Admin)",
)
async def set_statusable_status(
    statusable_type: str,
    statusable_id: int,
    body: StatusableAssignIn,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> None:
    """Sets the status for an entity, replacing any existing assignment.

    Fails with 400 on invalid or out-of-scope status_id."""

    await status_service.set_status(db, statusable_type, statusable_id, body.status_id)
    await db.commit()


@router.get(
    "/statusable-types",
    response_model=list[str],
    summary="Registrierte statusable Entity-Typen (Admin)",
)
async def list_statusable_types() -> list[str]:
    """Returns all registered statusable entity types for the scope combobox."""
    return [t.value for t in StatusableType]
