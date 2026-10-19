"""Business logic for FBF importance definitions (gjo_se_com)."""

from fastapi import HTTPException, status

from app.fbf.repositories import importance_definition_repository
from app.fbf.schemas.importance_definition_schemas import ImportanceDefinitionOut
from app.shared.db_access.session_types import AsyncSession


async def list_definitions(db: AsyncSession) -> list[ImportanceDefinitionOut]:
    """Return all importance definitions ordered by importance."""
    return await importance_definition_repository.get_all(db)


async def update_definition(
    db: AsyncSession,
    importance: int,
    label: str | None,
    description: str | None,
) -> ImportanceDefinitionOut:
    """Partially update an importance definition's label and/or description.

    Raises:
        HTTPException 404: Importance not found.
    """
    imp_def = await importance_definition_repository.update(db, importance, label, description)
    if imp_def is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Importance nicht gefunden.")
    return imp_def
