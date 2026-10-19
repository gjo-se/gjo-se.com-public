"""Database access for application focus areas (gjo_se_com).

Read operations return ``FocusAreaOut`` DTOs (never ORM models) so the service
layer stays free of ``app.<ctx>.models`` imports (Achse-2: ``services`` >
``repositories``). Write operations build the ORM row here and return the DTO.
"""

from collections.abc import Mapping

from sqlalchemy import asc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.application.models.focus_area import FocusArea
from app.application.models.focus_area_translation import FocusAreaTranslation
from app.application.schemas.focus_area_schemas import (
    FocusAreaLocaleFieldsOut,
    FocusAreaOut,
)
from app.shared.db_access import repository_helpers


def _to_out(area: FocusArea) -> FocusAreaOut:
    """Maps a focus-area ORM row (with loaded translations) to its DTO.

    Args:
        area: FocusArea with eager-loaded ``translations``.

    Returns:
        The read DTO handed to the service layer.
    """
    return FocusAreaOut(
        id=area.id,
        application_profile_id=area.application_profile_id,
        slug=area.slug,
        url=area.url,
        sort=area.sort,
        created_at=area.created_at,
        updated_at=area.updated_at,
        translations={t.locale: FocusAreaLocaleFieldsOut(title=t.title, summary=t.summary) for t in area.translations},
    )


async def get_by_profile(db: AsyncSession, profile_id: int) -> list[FocusAreaOut]:
    """Returns all focus areas for a profile, sorted by sort ASC, as DTOs."""
    result = await db.execute(
        select(FocusArea)
        .options(selectinload(FocusArea.translations))
        .where(FocusArea.application_profile_id == profile_id)
        .order_by(asc(FocusArea.sort))
    )
    return [_to_out(area) for area in result.scalars().all()]


async def get_by_id(db: AsyncSession, area_id: int) -> FocusAreaOut | None:
    """Returns a single focus area by id as DTO or None."""
    result = await db.execute(
        select(FocusArea).options(selectinload(FocusArea.translations)).where(FocusArea.id == area_id)
    )
    area = result.scalar_one_or_none()
    return _to_out(area) if area is not None else None


async def get_max_sort(db: AsyncSession, profile_id: int) -> int:
    """Returns the highest sort value for a profile's focus areas (0 if none)."""
    return await repository_helpers.get_max_sort(
        db,
        model=FocusArea,
        scope_attr=FocusArea.application_profile_id,
        scope_value=profile_id,
    )


async def create(
    db: AsyncSession,
    *,
    application_profile_id: int,
    slug: str,
    sort: int,
    url: str | None = None,
    translations: Mapping[str, FocusAreaLocaleFieldsOut] | None = None,
) -> FocusAreaOut:
    """Builds and persists a new focus area, returning its DTO.

    Args:
        db: Active async DB session.
        application_profile_id: Owning application_profile id.
        slug: Unique slug.
        sort: Pre-computed sort position.
        url: Optional proof link.
        translations: Optional locale → localized fields map (replaces rows).

    Returns:
        The created focus area as DTO.
    """
    area = FocusArea(
        application_profile_id=application_profile_id,
        slug=slug,
        sort=sort,
        url=url,
    )
    db.add(area)
    await db.flush()
    await db.refresh(area)
    if translations:
        await replace_translations(db, area.id, translations)
    created = await get_by_id(db, area.id)
    if created is None:
        raise RuntimeError("focus area vanished after create")
    return created


async def update(
    db: AsyncSession,
    area_id: int,
    *,
    changes: Mapping[str, object],
    translations: Mapping[str, FocusAreaLocaleFieldsOut] | None = None,
) -> FocusAreaOut | None:
    """Applies scalar changes to an existing focus area and returns its DTO.

    Args:
        db: Active async DB session.
        area_id: The focus_area id.
        changes: Scalar column changes (already filtered by the caller).
        translations: Optional locale → localized fields map (replaces rows).

    Returns:
        The updated focus area as DTO, or ``None`` when it does not exist.
    """
    result = await db.execute(select(FocusArea).where(FocusArea.id == area_id))
    area = result.scalar_one_or_none()
    if area is None:
        return None
    for key, value in changes.items():
        setattr(area, key, value)
    await db.flush()
    if translations is not None:
        await replace_translations(db, area.id, translations)
    return await get_by_id(db, area.id)


async def delete(db: AsyncSession, area_id: int) -> None:
    """Deletes a focus area by id (translations cascade via relationship)."""
    result = await db.execute(select(FocusArea).where(FocusArea.id == area_id))
    area = result.scalar_one_or_none()
    if area is not None:
        await db.delete(area)
        await db.flush()


async def reorder(
    db: AsyncSession,
    profile_id: int,
    ordered_ids: list[int],
) -> list[FocusAreaOut]:
    """Updates sort for multiple focus areas based on the ordered id list.

    Args:
        db: Active async DB session.
        profile_id: The application_profile id to scope the update.
        ordered_ids: List of focus_area ids in desired order (index = sort).

    Returns:
        The re-sorted list of focus areas as DTOs.
    """
    await repository_helpers.reorder(
        db,
        model=FocusArea,
        scope_attr=FocusArea.application_profile_id,
        scope_value=profile_id,
        ordered_ids=ordered_ids,
    )
    return await get_by_profile(db, profile_id)


async def replace_translations(
    db: AsyncSession,
    area_id: int,
    translations: Mapping[str, FocusAreaLocaleFieldsOut],
) -> None:
    """Replaces all translation rows of the focus area with *translations*.

    Uses the translation-table pattern: existing rows are deleted and the new
    rows created in one flush, avoiding partial merges.

    Args:
        db: Active async DB session.
        area_id: The focus_area id whose translations are replaced.
        translations: Mapping of locale → localized fields to persist.
    """
    await repository_helpers.replace_translations(
        db,
        translation_model=FocusAreaTranslation,
        fk_attr="focus_area_id",
        owner_id=area_id,
        translations=translations,
    )
