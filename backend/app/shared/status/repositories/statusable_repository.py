"""Async database access for Statusable – polymorphic junction operations (gjo_se_com).

ORM helpers stay available for callers that work with entities; ``get_status_record``
returns a ``StatusableRecord`` DTO with the resolved status for the service layer
(Achse 2: ``services`` > ``repositories``; strict K2).
"""

from collections.abc import Sequence

from sqlalchemy import delete as sa_delete
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.shared.status.domain.status_contract import StatusableRecord
from app.shared.status.models.status import Status, Statusable
from app.shared.status.repositories.status_repository import to_record


async def set_status(db: AsyncSession, statusable_type: str, statusable_id: int, status_id: int) -> None:
    """Assign a status to a statusable entity, replacing any existing assignment.

    Deletes existing junction row for (type, id) to respect the unique constraint,
    then inserts the new one.
    """
    _ = await db.execute(
        sa_delete(Statusable).where(
            Statusable.statusable_type == statusable_type,
            Statusable.statusable_id == statusable_id,
        )
    )
    db.add(Statusable(status_id=status_id, statusable_type=statusable_type, statusable_id=statusable_id))
    await db.flush()


async def clear_status(db: AsyncSession, statusable_type: str, statusable_id: int) -> None:
    """Removes the status assignment of a statusable entity, if any.

    Used when the owning entity is deleted: the polymorphic junction row has no
    FK, so it must be cleaned up explicitly.
    """
    _ = await db.execute(
        sa_delete(Statusable).where(
            Statusable.statusable_type == statusable_type,
            Statusable.statusable_id == statusable_id,
        )
    )


async def get_status(db: AsyncSession, statusable_type: str, statusable_id: int) -> Statusable | None:
    """Return the junction row with core_status metadata eagerly loaded, or None."""
    result = await db.execute(
        select(Statusable)
        .where(
            Statusable.statusable_type == statusable_type,
            Statusable.statusable_id == statusable_id,
        )
        .options(joinedload(Statusable.status))
    )
    return result.scalar_one_or_none()


async def get_status_record(
    db: AsyncSession,
    statusable_type: str,
    statusable_id: int,
) -> StatusableRecord | None:
    """Return the junction row with resolved status as a record, or ``None``."""
    statusable = await get_status(db, statusable_type, statusable_id)
    if statusable is None:
        return None
    return StatusableRecord(
        id=statusable.id,
        status_id=statusable.status_id,
        statusable_type=statusable.statusable_type,
        statusable_id=statusable.statusable_id,
        status=to_record(statusable.status),
    )


async def get_usage_count(db: AsyncSession, status_id: int) -> int:
    """Return the number of statusable entities linked to this status."""
    result = await db.execute(select(func.count()).select_from(Statusable).where(Statusable.status_id == status_id))
    return result.scalar_one()


async def resolve_status_map(
    db: AsyncSession,
    statusable_type: str,
    statusable_ids: Sequence[int],
) -> dict[int, tuple[str | None, str | None]]:
    """Return ``statusable_id -> (status_name, color_token)`` for the given ids.

    Batch-resolves ``core_status`` for a set of statusable entities so callers
    can build a response projection without mutating the ORM entity.
    """
    if not statusable_ids:
        return {}
    result = await db.execute(
        select(Statusable.statusable_id, Status.name, Status.color_token)
        .select_from(Statusable)
        .join(Status, Status.id == Statusable.status_id)
        .where(
            Statusable.statusable_type == statusable_type,
            Statusable.statusable_id.in_(statusable_ids),
        )
    )
    return {row[0]: (row[1], row[2]) for row in result.all()}


async def resolve_status(
    db: AsyncSession,
    statusable_type: str,
    statusable_id: int,
) -> tuple[str | None, str | None] | None:
    """Return ``(status_name, color_token)`` for a single statusable, or ``None``."""
    result = await db.execute(
        select(Status.name, Status.color_token)
        .select_from(Statusable)
        .join(Status, Status.id == Statusable.status_id)
        .where(
            Statusable.statusable_type == statusable_type,
            Statusable.statusable_id == statusable_id,
        )
    )
    row = result.first()
    return (row[0], row[1]) if row is not None else None
