"""Async database access for Tag (gjo_se_com).

The ``*_record`` helpers return ``TagRecord`` DTOs and the write helpers accept
``TagDraft``/``TagRecord`` objects, so the service layer imports no
``app.shared.tagging.models`` (Achse 2: ``services`` > ``repositories``).
"""

from functools import partial

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access import repository_helpers
from app.shared.tagging.domain.tag_contract import TagDraft, TagRecord
from app.shared.tagging.models.tag import Tag

_MUTABLE_FIELDS = ("name", "slug", "category", "color_token", "description", "sort_order", "scope")


def to_record(tag: Tag) -> TagRecord:
    """Maps a ``Tag`` ORM row to its service-boundary record.

    Args:
        tag: The loaded ORM tag row.

    Returns:
        The read record handed to the service layer.
    """
    return TagRecord(
        id=tag.id,
        name=tag.name,
        slug=tag.slug,
        category=tag.category,
        color_token=tag.color_token,
        description=tag.description,
        sort_order=tag.sort_order,
        scope=tag.scope,
        created_at=tag.created_at,
        updated_at=tag.updated_at,
    )


async def get_all(
    db: AsyncSession,
    category: str | None = None,
    taggable_type: str | None = None,
    slug: str | None = None,
) -> list[TagRecord]:
    """Return all tags ordered by category, sort_order, name.

    Optionally filtered by category, slug (exact match) and/or taggable_type
    (scope filter). When taggable_type is set, only tags whose scope includes
    that type (or scope IS NULL – backward-compat) are returned.
    """
    stmt = select(Tag).order_by(Tag.category, Tag.sort_order, Tag.name)
    if category is not None:
        stmt = stmt.where(Tag.category == category)
    if slug is not None:
        stmt = stmt.where(Tag.slug == slug)
    if taggable_type is not None:
        stmt = stmt.where(
            text(
                ":taggable_type = ANY(shared_tag.scope)",
            ).bindparams(taggable_type=taggable_type),
        )
    result = await db.execute(stmt)
    return [to_record(tag) for tag in result.scalars().all()]


async def get_by_id(db: AsyncSession, tag_id: int) -> TagRecord | None:
    """Return a single tag by primary key as a record, or ``None``."""
    tag = await db.get(Tag, tag_id)
    return to_record(tag) if tag is not None else None


async def get_name_id_mapping(db: AsyncSession) -> dict[str, int]:
    """Return ``{tag name: tag id}`` for all seeded tags.

    Used by callers that resolve a list of tag names to ids without importing
    the ``Tag`` model (e.g. the FBF skill extraction).

    Args:
        db: Active async DB session.

    Returns:
        Mapping of tag name to primary key.
    """
    result = await db.execute(select(Tag.name, Tag.id))
    return {row.name: row.id for row in result.all()}


async def get_by_category(db: AsyncSession, category: str) -> list[TagRecord]:
    """Return all tags in a given category as records."""
    result = await db.execute(select(Tag).where(Tag.category == category).order_by(Tag.sort_order, Tag.name))
    return [to_record(tag) for tag in result.scalars().all()]


async def get_by_name_and_category(db: AsyncSession, name: str, category: str) -> TagRecord | None:
    """Return the unique tag with given name and category as a record, or None."""
    result = await db.execute(select(Tag).where(Tag.name == name, Tag.category == category))
    tag = result.scalar_one_or_none()
    return to_record(tag) if tag is not None else None


async def get_by_slug(db: AsyncSession, slug: str) -> TagRecord | None:
    """Return the unique tag with the given slug as a record, or None."""
    result = await db.execute(select(Tag).where(Tag.slug == slug))
    tag = result.scalar_one_or_none()
    return to_record(tag) if tag is not None else None


slug_exists = partial(repository_helpers.slug_exists, model=Tag)


async def create(db: AsyncSession, draft: TagDraft) -> TagRecord:
    """Persist a new tag built from *draft* and return its record."""
    tag = Tag(
        name=draft.name,
        slug=draft.slug,
        category=draft.category,
        color_token=draft.color_token,
        description=draft.description,
        sort_order=draft.sort_order,
        scope=draft.scope,
    )
    db.add(tag)
    await db.flush()
    await db.refresh(tag)
    return to_record(tag)


async def update(db: AsyncSession, record: TagRecord) -> TagRecord:
    """Apply *record*'s fields to the persisted tag and return the refreshed record."""
    tag = await db.get(Tag, record.id)
    if tag is None:
        return record
    for field in _MUTABLE_FIELDS:
        setattr(tag, field, getattr(record, field))
    await db.flush()
    await db.refresh(tag)
    return to_record(tag)


async def delete(db: AsyncSession, record: TagRecord) -> None:
    """Remove the tag referenced by *record* (cascade deletes junction rows)."""
    tag = await db.get(Tag, record.id)
    if tag is not None:
        await db.delete(tag)
        await db.flush()
