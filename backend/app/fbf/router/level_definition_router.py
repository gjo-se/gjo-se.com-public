"""FastAPI router for FBF level definition endpoints (gjo_se_com).

Admin (mounted unter /api/v1/admin/fbf via router.py):
    GET    /level-definition        – List all level definitions
    PATCH  /level-definition/{level} – Update level definition (label, description)
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.schemas.level_definition_schemas import (
    LevelDefinitionOut,
    LevelDefinitionUpdate,
)
from app.fbf.services import level_definition_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


@router.get(
    "/level-definition",
    response_model=list[LevelDefinitionOut],
    summary="List all level definitions (Admin)",
)
async def list_level_definitions(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[LevelDefinitionOut]:
    """Returns all level definitions ordered by level."""
    defs = await level_definition_service.list_definitions(db)
    return [LevelDefinitionOut.model_validate(d) for d in defs]


@router.patch(
    "/level-definition/{level}",
    response_model=LevelDefinitionOut,
    summary="Update a level definition (Admin)",
)
async def update_level_definition(
    level: int,
    body: LevelDefinitionUpdate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> LevelDefinitionOut:
    """Partially updates a level definition's label and/or description."""
    level_def = await level_definition_service.update_definition(db, level, body.label, body.description)
    await db.commit()
    return LevelDefinitionOut.model_validate(level_def)
