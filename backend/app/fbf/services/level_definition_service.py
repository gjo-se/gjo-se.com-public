"""Business logic for FBF level definitions (gjo_se_com)."""

from fastapi import HTTPException, status

from app.fbf.repositories import level_definition_repository
from app.fbf.schemas.level_definition_schemas import LevelDefinitionOut
from app.shared.db_access.session_types import AsyncSession


async def list_definitions(db: AsyncSession) -> list[LevelDefinitionOut]:
    """Return all level definitions ordered by level."""
    return await level_definition_repository.get_all(db)


async def update_definition(
    db: AsyncSession,
    level: int,
    label: str | None,
    description: str | None,
) -> LevelDefinitionOut:
    """Partially update a level definition's label and/or description.

    Raises:
        HTTPException 404: Level not found.
    """
    level_def = await level_definition_repository.update(db, level, label, description)
    if level_def is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Level nicht gefunden.")
    return level_def
