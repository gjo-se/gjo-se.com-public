"""Async database access for Status (gjo_se_com).

ORM helper functions stay available for callers that work with entities; the
``*_record`` helpers return ``StatusRecord`` DTOs for the service layer
(Achse 2: ``services`` > ``repositories``; strict K2).
"""

from collections.abc import Mapping
from functools import partial

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access import repository_helpers
from app.shared.status.domain.status_contract import StatusRecord
from app.shared.status.models.status import Status


def to_record(status: Status) -> StatusRecord:
    """Maps a ``Status`` ORM row to its service-boundary record.

    Args:
        status: The loaded ORM status row.

    Returns:
        The read record handed to the service layer.
    """
    return StatusRecord(
        id=status.id,
        name=status.name,
        slug=status.slug,
        category=status.category,
        color_token=status.color_token,
        description=status.description,
        sort_order=status.sort_order,
        scope=status.scope,
        created_at=status.created_at,
        updated_at=status.updated_at,
    )


async def get_all(
    db: AsyncSession,
    category: str | None = None,
    statusable_type: str | None = None,
    slug: str | None = None,
) -> list[Status]:
    """Return all statuses ordered by category, sort_order, name.

    Optionally filtered by category, slug (exact match) and/or statusable_type
    (scope filter).
    """
    stmt = select(Status).order_by(Status.category, Status.sort_order, Status.name)
    if category is not None:
        stmt = stmt.where(Status.category == category)
    if slug is not None:
        stmt = stmt.where(Status.slug == slug)
    if statusable_type is not None:
        stmt = stmt.where(
            text(
                "(shared_status.scope IS NULL OR :statusable_type = ANY(shared_status.scope))",
            ).bindparams(statusable_type=statusable_type),
        )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, status_id: int) -> Status | None:
    """Return a single status by primary key."""
    return await db.get(Status, status_id)


async def get_by_category(db: AsyncSession, category: str) -> list[Status]:
    """Return all statuses in a given category."""
    result = await db.execute(
        select(Status).where(Status.category == category).order_by(Status.sort_order, Status.name)
    )
    return list(result.scalars().all())


async def get_by_name_and_category(db: AsyncSession, name: str, category: str) -> Status | None:
    """Return the unique status with given name and category, or None."""
    result = await db.execute(select(Status).where(Status.name == name, Status.category == category))
    return result.scalar_one_or_none()


async def get_by_name_for_type(db: AsyncSession, name: str, statusable_type: str) -> StatusRecord | None:
    """Return the status with the given name scoped to *statusable_type*.

    Statuses are organised by ``category`` (e.g. ``general``) and assigned to
    entity types via the ``scope`` text-array (e.g. ``fbf_skill``). Lookups by
    category therefore miss the type-scoped statuses used across the skill
    lifecycle. This helper resolves by name + scope (mirrors
    ``assign_default_status``), so a status exists for the entity type
    regardless of its category.

    Returns:
        The matching ``StatusRecord`` or ``None``.
    """
    result = await db.execute(
        select(Status).where(
            Status.name == name,
            text("(shared_status.scope IS NULL OR :statusable_type = ANY(shared_status.scope))").bindparams(
                statusable_type=statusable_type
            ),
        )
    )
    status = result.scalar_one_or_none()
    return to_record(status) if status is not None else None


async def get_by_slug(db: AsyncSession, slug: str) -> Status | None:
    """Return the unique status with the given slug, or None."""
    result = await db.execute(select(Status).where(Status.slug == slug))
    return result.scalar_one_or_none()


slug_exists = partial(repository_helpers.slug_exists, model=Status)


async def create(db: AsyncSession, status: Status) -> Status:
    """Persist a new status and return it with generated fields."""
    db.add(status)
    await db.flush()
    await db.refresh(status)
    return status


async def update(db: AsyncSession, status: Status) -> Status:
    """Persist changes to an existing status and return refreshed instance."""
    await db.flush()
    await db.refresh(status)
    return status


async def delete(db: AsyncSession, status: Status) -> None:
    """Remove a status from the database."""
    await db.delete(status)
    await db.flush()


async def list_records(
    db: AsyncSession,
    category: str | None = None,
    statusable_type: str | None = None,
    slug: str | None = None,
) -> list[StatusRecord]:
    """Return all statuses (optionally filtered) as records for the service."""
    statuses = await get_all(db, category=category, statusable_type=statusable_type, slug=slug)
    return [to_record(status) for status in statuses]


async def get_record_by_id(db: AsyncSession, status_id: int) -> StatusRecord | None:
    """Return a single status by id as a record, or ``None``."""
    status = await get_by_id(db, status_id)
    return to_record(status) if status is not None else None


async def get_record_by_name_and_category(db: AsyncSession, name: str, category: str) -> StatusRecord | None:
    """Return the unique status (name, category) as a record, or ``None``."""
    status = await get_by_name_and_category(db, name, category)
    return to_record(status) if status is not None else None


async def create_record(
    db: AsyncSession,
    *,
    name: str,
    slug: str,
    category: str,
    color_token: str,
    description: str | None,
    sort_order: float,
    scope: list[str] | None = None,
) -> StatusRecord:
    """Persist a new status built from scalar fields and return its record.

    Args:
        db: Active async DB session.
        name: Display name.
        slug: Resolved unique slug.
        category: Status category.
        color_token: UI colour token.
        description: Optional description.
        sort_order: Sort position within the category.
        scope: Entity types the status applies to (``None`` = global).

    Returns:
        The created status as a record.
    """
    status_obj = Status(
        name=name,
        slug=slug,
        category=category,
        color_token=color_token,
        description=description,
        sort_order=sort_order,
        scope=scope,
    )
    created = await create(db, status_obj)
    return to_record(created)


async def update_record(
    db: AsyncSession,
    status_id: int,
    *,
    changes: Mapping[str, object],
) -> StatusRecord | None:
    """Apply scalar changes to an existing status and return its record.

    Args:
        db: Active async DB session.
        status_id: The status id to update.
        changes: Column changes to apply (already validated by the caller).

    Returns:
        The updated status as a record, or ``None`` when it does not exist.
    """
    status_obj = await get_by_id(db, status_id)
    if status_obj is None:
        return None
    for key, value in changes.items():
        setattr(status_obj, key, value)
    updated = await update(db, status_obj)
    return to_record(updated)


async def delete_record(db: AsyncSession, status_id: int) -> None:
    """Delete a status by id (no-op when it does not exist)."""
    status_obj = await get_by_id(db, status_id)
    if status_obj is not None:
        await delete(db, status_obj)
