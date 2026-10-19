"""Domänenfreie Repository-Helfer für wiederkehrendes Sort-/Translations-Boilerplate.

Kapselt die in ``app/**/repositories/*.py`` kopierten Muster
``get_max_sort`` (``coalesce(max(sort), 0)``), ``reorder`` (Sort nach
Positions-Index) und ``replace_translations`` (Translation-Table: delete +
add_all). Die Helfer sind modell-agnostisch (Modell/Spalten werden injiziert),
importieren keine Domäne und liegen bewusst in ``app.shared.db_access``.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from pydantic import BaseModel
from sqlalchemy import delete as sa_delete
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession


def to_out(row: Any, *, dto_cls: Any) -> Any:
    """Map an ORM row to its read DTO.

    Args:
        row: The persisted ORM row.
        dto_cls: Pydantic DTO class with ``model_validate``.

    Returns:
        The validated DTO.
    """
    return dto_cls.model_validate(row)


async def get_by_id(db: AsyncSession, obj_id: Any, *, model: Any, dto_cls: Any) -> Any:
    """Fetch one row by primary key and map it to its DTO.

    Args:
        db: Active async DB session.
        obj_id: Primary key value.
        model: SQLAlchemy model.
        dto_cls: Pydantic DTO class.

    Returns:
        The DTO, or ``None`` when no row with *obj_id* exists.
    """
    row = await db.get(model, obj_id)
    return None if row is None else dto_cls.model_validate(row)


async def update(db: AsyncSession, obj_id: Any, data: Any, *, model: Any, dto_cls: Any) -> Any:
    """Apply a PATCH payload (``exclude_unset``) and return the refreshed DTO.

    Args:
        db: Active async DB session.
        obj_id: Primary key value.
        data: Pydantic update payload (only set fields are applied).
        model: SQLAlchemy model.
        dto_cls: Pydantic DTO class.

    Returns:
        The refreshed DTO, or ``None`` when no row with *obj_id* exists.
    """
    row = await db.get(model, obj_id)
    if row is None:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    await db.flush()
    await db.refresh(row)
    return dto_cls.model_validate(row)


async def delete(db: AsyncSession, obj_id: Any, *, model: Any) -> bool:
    """Delete one row by primary key.

    Args:
        db: Active async DB session.
        obj_id: Primary key value.
        model: SQLAlchemy model.

    Returns:
        ``True`` when a row was deleted; ``False`` when none exists.
    """
    row = await db.get(model, obj_id)
    if row is None:
        return False
    await db.delete(row)
    await db.flush()
    return True


async def get_max_sort(
    db: AsyncSession,
    *,
    model: Any,
    scope_attr: Any,
    scope_value: Any,
) -> int:
    """Return the highest ``sort`` value in *scope* (``0`` when none).

    Args:
        db: Active async DB session.
        model: SQLAlchemy model carrying a ``sort`` column.
        scope_attr: Column to scope on (e.g. ``Model.application_profile_id``).
        scope_value: Value for *scope_attr*.

    Returns:
        The maximum ``sort`` within the scope, or ``0`` when the scope is empty.
    """
    result = await db.execute(select(func.coalesce(func.max(model.sort), 0)).where(scope_attr == scope_value))
    return result.scalar_one()


async def reorder(
    db: AsyncSession,
    *,
    model: Any,
    scope_attr: Any,
    scope_value: Any,
    ordered_ids: Sequence[int],
) -> None:
    """Set ``sort`` for rows in *scope* by their index in *ordered_ids*.

    Args:
        db: Active async DB session.
        model: SQLAlchemy model carrying ``id`` and ``sort`` columns.
        scope_attr: Column to scope the lookup on.
        scope_value: Value for *scope_attr*.
        ordered_ids: Row ids in the desired order (index = new ``sort``).
    """
    for new_index, obj_id in enumerate(ordered_ids):
        result = await db.execute(select(model).where(model.id == obj_id, scope_attr == scope_value))
        obj = result.scalar_one_or_none()
        if obj is not None:
            obj.sort = new_index
    await db.flush()


async def replace_translations(
    db: AsyncSession,
    *,
    translation_model: Any,
    fk_attr: str,
    owner_id: int,
    translations: Mapping[str, BaseModel],
) -> None:
    """Replace all translation rows of *owner_id* with *translations*.

    Translation-table pattern: existing rows are deleted unconditionally (a
    DELETE without matches is a no-op) and the new rows are inserted, avoiding a
    partial merge and a lazy-load on the ORM relationship.

    Args:
        db: Active async DB session.
        translation_model: SQLAlchemy translation model.
        fk_attr: Foreign-key attribute name on *translation_model* (e.g.
            ``"focus_area_id"``).
        owner_id: Id of the owning row.
        translations: Mapping of locale → localized fields (Pydantic model).
    """
    fk_column = getattr(translation_model, fk_attr)
    await db.execute(sa_delete(translation_model).where(fk_column == owner_id))
    db.add_all(
        translation_model(**{fk_attr: owner_id, "locale": locale, **fields.model_dump()})
        for locale, fields in translations.items()
    )
    await db.flush()


async def slug_exists(
    db: AsyncSession,
    slug: str,
    *,
    model: Any,
    exclude_id: Any = None,
) -> bool:
    """Return whether a row with *slug* already exists.

    Args:
        db: Active async DB session.
        slug: Slug value to look up.
        model: SQLAlchemy model carrying ``slug``/``id`` columns.
        exclude_id: Optional id to exclude (self-update).

    Returns:
        ``True`` when a matching slug exists.
    """
    stmt = select(func.count()).select_from(model).where(model.slug == slug)
    if exclude_id is not None:
        stmt = stmt.where(model.id != exclude_id)
    result = await db.execute(stmt)
    return result.scalar_one() > 0
