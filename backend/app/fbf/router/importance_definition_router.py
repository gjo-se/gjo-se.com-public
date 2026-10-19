"""FastAPI router for FBF importance definition endpoints (gjo_se_com).

Admin (mounted unter /api/v1/admin/fbf via router.py):
    GET    /importance-definition        – List all importance definitions
    PATCH  /importance-definition/{importance} – Update importance definition (label, description)
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.schemas.importance_definition_schemas import (
    ImportanceDefinitionOut,
    ImportanceDefinitionUpdate,
)
from app.fbf.services import importance_definition_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


@router.get(
    "/importance-definition",
    response_model=list[ImportanceDefinitionOut],
    summary="List all importance definitions (Admin)",
)
async def list_importance_definitions(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[ImportanceDefinitionOut]:
    """Returns all importance definitions ordered by importance."""
    defs = await importance_definition_service.list_definitions(db)
    return [ImportanceDefinitionOut.model_validate(d) for d in defs]


@router.patch(
    "/importance-definition/{importance}",
    response_model=ImportanceDefinitionOut,
    summary="Update an importance definition (Admin)",
)
async def update_importance_definition(
    importance: int,
    body: ImportanceDefinitionUpdate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ImportanceDefinitionOut:
    """Partially updates an importance definition's label and/or description."""
    imp_def = await importance_definition_service.update_definition(db, importance, body.label, body.description)
    await db.commit()
    return ImportanceDefinitionOut.model_validate(imp_def)
