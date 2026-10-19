"""Database access for FBF level definitions (gjo_se_com).

Reads and writes return ``LevelDefinitionOut`` DTOs so the service layer stays
free of ``app.fbf.models`` imports (Achse 2: ``services`` > ``repositories``).
"""

from functools import partial

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.level_definition import LevelDefinition
from app.fbf.schemas.level_definition_schemas import LevelDefinitionOut
from app.shared.db_access import repository_helpers

_to_out = partial(repository_helpers.to_out, dto_cls=LevelDefinitionOut)


async def get_all(db: AsyncSession) -> list[LevelDefinitionOut]:
    """Return all level definitions ordered by level."""
    result = await db.execute(select(LevelDefinition).order_by(LevelDefinition.level))
    return [_to_out(row) for row in result.scalars().all()]


async def update(
    db: AsyncSession,
    level: int,
    label: str | None,
    description: str | None,
) -> LevelDefinitionOut | None:
    """Partially updates a level definition's label/description and returns its DTO.

    Args:
        db: Database session.
        level: Primary key of the definition.
        label: New label (only applied when not ``None``).
        description: New description (only applied when not ``None``).

    Returns:
        Updated definition as DTO, or ``None`` when it does not exist.
    """
    level_def = await db.get(LevelDefinition, level)
    if level_def is None:
        return None
    if label is not None:
        level_def.label = label
    if description is not None:
        level_def.description = description
    await db.flush()
    await db.refresh(level_def)
    return _to_out(level_def)
