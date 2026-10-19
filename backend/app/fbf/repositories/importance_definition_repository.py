"""Database access for FBF importance definitions (gjo_se_com).

Reads and writes return ``ImportanceDefinitionOut`` DTOs so the service layer
stays free of ``app.fbf.models`` imports (Achse 2: ``services`` > ``repositories``).
"""

from functools import partial

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.importance_definition import ImportanceDefinition
from app.fbf.schemas.importance_definition_schemas import ImportanceDefinitionOut
from app.shared.db_access import repository_helpers

_to_out = partial(repository_helpers.to_out, dto_cls=ImportanceDefinitionOut)


async def get_all(db: AsyncSession) -> list[ImportanceDefinitionOut]:
    """Return all importance definitions ordered by importance."""
    result = await db.execute(select(ImportanceDefinition).order_by(ImportanceDefinition.importance))
    return [_to_out(row) for row in result.scalars().all()]


async def update(
    db: AsyncSession,
    importance: int,
    label: str | None,
    description: str | None,
) -> ImportanceDefinitionOut | None:
    """Partially updates an importance definition's label/description and returns its DTO.

    Args:
        db: Database session.
        importance: Primary key of the definition.
        label: New label (only applied when not ``None``).
        description: New description (only applied when not ``None``).

    Returns:
        Updated definition as DTO, or ``None`` when it does not exist.
    """
    imp_def = await db.get(ImportanceDefinition, importance)
    if imp_def is None:
        return None
    if label is not None:
        imp_def.label = label
    if description is not None:
        imp_def.description = description
    await db.flush()
    await db.refresh(imp_def)
    return _to_out(imp_def)
