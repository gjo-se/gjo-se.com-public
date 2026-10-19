"""Database access for FBF skill groups (gjo_se_com)."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import delete as sa_delete
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.fbf.models.skill_group import SkillGroup
from app.fbf.models.skill_group_translation import SkillGroupTranslation


@dataclass(frozen=True)
class SkillGroupRef:
    """Read DTO for a skill group: the service-boundary type (not the ORM model).

    Carries the scalar fields plus the locale→label translation map so the
    service layer stays free of ``app.fbf.models`` imports.
    """

    id: int
    sort: int
    priority: str
    labels: dict[str, str]


def _to_ref(group: SkillGroup) -> SkillGroupRef:
    """Maps a skill-group ORM row (with loaded translations) to its DTO.

    Args:
        group: SkillGroup with eager-loaded ``translations``.

    Returns:
        The read DTO handed to the service layer.
    """
    return SkillGroupRef(
        id=group.id,
        sort=group.sort,
        priority=group.priority,
        labels={t.locale: t.label for t in group.translations},
    )


async def get_public_groups(db: AsyncSession) -> list[SkillGroupRef]:
    """Return all curated skill groups ordered by ``sort`` ASC as DTOs.

    Translations are eager-loaded so the caller can resolve the localized
    ``label`` (Locale-Pick with ``de`` fallback). Alle Gruppen werden geliefert
    – das FE-Grid blendet leere Gruppen selbst aus, und die Admin-Kuratierungs-
    Combobox (A6) braucht alle Gruppen zum Zuweisen.
    """
    result = await db.execute(
        select(SkillGroup).options(selectinload(SkillGroup.translations)).order_by(SkillGroup.sort.asc())
    )
    return [_to_ref(group) for group in result.scalars().all()]


async def get_groups_with_translations(db: AsyncSession) -> list[SkillGroupRef]:
    """Return all curated skill groups ordered by ``sort`` ASC with translations.

    Liefert die Admin-Ansicht aller Gruppen samt vollstaendiger
    Translation-Set (alle Locales) – kein Locale-Pick, damit der Admin jede
    Sprache einzeln sieht und editiert.
    """
    result = await db.execute(
        select(SkillGroup).options(selectinload(SkillGroup.translations)).order_by(SkillGroup.sort.asc())
    )
    return [_to_ref(group) for group in result.scalars().all()]


async def update_group(
    db: AsyncSession,
    group_id: int,
    *,
    sort: int | None,
    priority: str | None,
    labels: dict[str, str] | None,
) -> SkillGroupRef | None:
    """Partially update a skill group and optionally replace its labels.

    Setzt ``sort``/``priority`` und – wenn ``labels`` uebergeben wird – ersetzt
    die bestehenden Translation-Rows via Translation-Table-Pattern (DELETE der
    alten, INSERT der neuen Rows in einem Flush, analog Proof-Statements).

    Args:
        db: Active async DB session.
        group_id: Die ``fbf_skill_group.id``.
        sort: Neue Reihenfolge (optional).
        priority: Neue Prioritaet (``high``/``medium``/``base``, optional).
        labels: Neues Locale→Label-Mapping (optional).

    Returns:
        Die aktualisierte Gruppe als DTO oder ``None`` wenn die Gruppe nicht
        existiert.
    """
    group = await db.get(SkillGroup, group_id)
    if group is None:
        return None

    if sort is not None:
        group.sort = sort
    if priority is not None:
        group.priority = priority
    if labels is not None:
        # Existing translation rows are removed unconditionally – a DELETE with
        # no matching rows is a no-op. Uses explicit group_id to avoid a sync
        # lazy-load on the relationship (MissingGreenlet after flush/refresh).
        _ = await db.execute(sa_delete(SkillGroupTranslation).where(SkillGroupTranslation.skill_group_id == group.id))
        db.add_all(
            SkillGroupTranslation(
                skill_group_id=group.id,
                locale=locale,
                label=label,
            )
            for locale, label in labels.items()
        )

    await db.flush()
    # Re-fetch via a fresh select with eager-loaded translations for a complete
    # admin DTO. ``db.get`` alone would return the identity-mapped instance whose
    # ``translations`` collection is still unloaded → lazy load (MissingGreenlet).
    result = await db.execute(
        select(SkillGroup).options(selectinload(SkillGroup.translations)).where(SkillGroup.id == group_id)
    )
    row = result.scalar_one_or_none()
    return _to_ref(row) if row is not None else None


async def reorder_groups(db: AsyncSession, ordered_ids: list[int]) -> None:
    """Set ``sort = index`` for each group id in ``ordered_ids``.

    Args:
        db: Active async DB session.
        ordered_ids: Gruppen-IDs in gewuenschter Reihenfolge (Index → sort).
    """
    # The groups have a unique sort value. Assigning the final values directly
    # can violate that constraint while two rows are being swapped (e.g. sort
    # 0 and 1). Move the rows to a temporary, disjoint range first.
    groups = [await db.get(SkillGroup, group_id) for group_id in ordered_ids]
    for temporary_index, group in enumerate(groups):
        if group is not None:
            group.sort = -(temporary_index + 1)
    await db.flush()

    for new_index, group in enumerate(groups):
        if group is not None:
            group.sort = new_index
    await db.flush()


async def get_group_by_id(db: AsyncSession, group_id: int) -> SkillGroupRef | None:
    """Return a single skill group by id as DTO, or None when it does not exist.

    Args:
        db: Active async DB session.
        group_id: Die ``fbf_skill_group.id``.

    Returns:
        Die Gruppe als DTO oder ``None`` wenn sie nicht existiert.
    """
    result = await db.execute(
        select(SkillGroup).options(selectinload(SkillGroup.translations)).where(SkillGroup.id == group_id)
    )
    row = result.scalar_one_or_none()
    return _to_ref(row) if row is not None else None


async def delete_group(db: AsyncSession, group_id: int) -> bool:
    """Delete a skill group together with its translation rows.

    Loescht zuerst explizit die Translation-Rows (async-sicher, vermeidet ein
    sync-Lazy-Load der ``translations``-Collection) und anschliessend die
    Gruppe selbst. Referenzierende ``fbf_skill``-Zeilen muessen vorher geprueft
    werden – der FK wird hier nicht kaskadiert.

    Args:
        db: Active async DB session.
        group_id: Die ``fbf_skill_group.id``.

    Returns:
        True when the row was deleted; False when it does not exist.
    """
    group = await db.get(SkillGroup, group_id)
    if group is None:
        return False
    _ = await db.execute(sa_delete(SkillGroupTranslation).where(SkillGroupTranslation.skill_group_id == group.id))
    await db.delete(group)
    await db.flush()
    return True


async def create_group(
    db: AsyncSession,
    *,
    labels: dict[str, str],
    priority: str | None,
) -> SkillGroupRef:
    """Create a new skill group appended at the end of the current order.

    ``sort`` wird automatisch auf den hoechsten vorhandenen ``sort``-Wert + 1
    gesetzt (neue Gruppe kommt ans Ende). Die Translations werden direkt
    angelegt; danach wird die Gruppe inkl. Translations zurueckgeladen.

    Args:
        db: Active async DB session.
        labels: Locale→Label-Mapping (mind. ein Eintrag).
        priority: ``high``/``medium``/``base`` (optional, Default ``medium``).

    Returns:
        Die neu angelegte Gruppe als DTO.
    """
    max_sort = (await db.execute(select(func.coalesce(func.max(SkillGroup.sort), -1)))).scalar_one()
    group = SkillGroup(sort=max_sort + 1, priority=priority or "medium")
    db.add(group)
    await db.flush()
    db.add_all(
        SkillGroupTranslation(
            skill_group_id=group.id,
            locale=locale,
            label=label,
        )
        for locale, label in labels.items()
    )
    await db.flush()
    result = await db.execute(
        select(SkillGroup).options(selectinload(SkillGroup.translations)).where(SkillGroup.id == group.id)
    )
    return _to_ref(result.scalar_one())
