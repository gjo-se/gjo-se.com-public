"""Async database access for Taggable – polymorphic junction operations (gjo_se_com).

``get_tags`` returns ``TaggableRecord`` DTOs with the resolved tag for the
service layer (Achse 2: ``services`` > ``repositories``).
"""

from sqlalchemy import delete as sa_delete
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.shared.tagging.domain.tag_contract import TaggableRecord
from app.shared.tagging.models.tag import Taggable
from app.shared.tagging.repositories.tag_repository import to_record


async def set_tags(db: AsyncSession, taggable_type: str, taggable_id: int, tag_ids: list[int]) -> None:
    """Replace all tag assignments for a taggable entity with the given tag_ids.

    Deletes existing junction rows for (type, id), then inserts new ones.
    """
    _ = await db.execute(
        sa_delete(Taggable).where(
            Taggable.taggable_type == taggable_type,
            Taggable.taggable_id == taggable_id,
        )
    )
    for tag_id in tag_ids:
        db.add(Taggable(tag_id=tag_id, taggable_type=taggable_type, taggable_id=taggable_id))
    await db.flush()


async def get_tags(db: AsyncSession, taggable_type: str, taggable_id: int) -> list[TaggableRecord]:
    """Return junction rows as records with the resolved tag."""
    result = await db.execute(
        select(Taggable)
        .where(
            Taggable.taggable_type == taggable_type,
            Taggable.taggable_id == taggable_id,
        )
        .options(joinedload(Taggable.tag))
    )
    return [
        TaggableRecord(
            tag_id=row.tag_id,
            taggable_type=row.taggable_type,
            taggable_id=row.taggable_id,
            tag=to_record(row.tag),
        )
        for row in result.scalars().all()
    ]


async def get_usage_count(db: AsyncSession, tag_id: int) -> int:
    """Return the number of taggable entities linked to this tag."""
    result = await db.execute(select(func.count()).select_from(Taggable).where(Taggable.tag_id == tag_id))
    return result.scalar_one()


async def get_usage_by_tag(db: AsyncSession, tag_id: int) -> list[tuple[str, int]]:
    """Return (taggable_type, count) pairs for a given tag_id."""
    result = await db.execute(
        select(Taggable.taggable_type, func.count())
        .where(Taggable.tag_id == tag_id)
        .group_by(Taggable.taggable_type)
        .order_by(Taggable.taggable_type)
    )
    return [(row[0], row[1]) for row in result.all()]
