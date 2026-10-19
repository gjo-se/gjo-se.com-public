"""Business logic for Tag CRUD (gjo_se_com)."""

import logging

from fastapi import HTTPException, status

from app.shared.db_access.service_helpers import resolve_unique_slug
from app.shared.db_access.session_types import AsyncSession
from app.shared.tagging.domain.tag_contract import TagDraft, TagRecord
from app.shared.tagging.domain.tagging_rules import ColorToken
from app.shared.tagging.repositories import tag_repository, taggable_repository

logger = logging.getLogger(__name__)


async def list_tags(
    db: AsyncSession,
    category: str | None = None,
    taggable_type: str | None = None,
    slug: str | None = None,
) -> list[tuple[TagRecord, int]]:
    """Return all tags with their usage count, optionally filtered by category, slug and/or taggable_type."""
    tags = await tag_repository.get_all(db, category=category, taggable_type=taggable_type, slug=slug)
    result: list[tuple[TagRecord, int]] = []
    for tag in tags:
        count = await taggable_repository.get_usage_count(db, tag.id)
        result.append((tag, count))
    return result


async def create_tag(
    db: AsyncSession,
    name: str,
    category: str,
    color_token: str,
    description: str | None,
    sort_order: int,
    scope: list[str] | None = None,
    slug: str | None = None,
) -> TagRecord:
    """Create a new tag, failing with 409 on duplicate (name, category).

    When *slug* is empty it is auto-generated from *name* via ``slugify()``.
    Auto-generated slugs use a suffix strategy (``-2``, ``-3``, ...) on
    collision. An explicitly provided slug that already exists raises 409.

    Raises:
        HTTPException 400: Invalid color_token.
        HTTPException 409: Duplicate name + category combination or duplicate slug.
    """
    try:
        ColorToken(color_token)
    except ValueError:
        logger.warning(
            "Invalid color_token '%s' for tag '%s' / '%s'",
            color_token,
            name,
            category,
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ungültiges Color-Token: '{color_token}'.",
        ) from None

    existing = await tag_repository.get_by_name_and_category(db, name, category)
    if existing is not None:
        logger.warning(
            "Duplicate tag name='%s' category='%s' (existing id=%s)",
            name,
            category,
            existing.id,
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tag '{name}' in Kategorie '{category}' existiert bereits.",
        )

    resolved_slug = await resolve_unique_slug(
        tag_repository.slug_exists,
        db,
        name=name,
        category=category,
        slug=slug,
        label="Tag",
    )

    draft = TagDraft(
        name=name,
        slug=resolved_slug,
        category=category,
        color_token=color_token,
        description=description,
        sort_order=sort_order,
        scope=scope,
    )
    return await tag_repository.create(db, draft)


async def update_tag(
    db: AsyncSession,
    tag_id: int,
    name: str | None,
    category: str | None,
    color_token: str | None,
    description: str | None,
    sort_order: int | None,
    scope: list[str] | None = None,
    slug: str | None = None,
) -> TagRecord:
    """Partially update a tag. Only non-None fields are applied.

    Raises:
        HTTPException 400: Invalid color_token.
        HTTPException 404: Tag not found.
        HTTPException 409: Renamed tag conflicts with an existing (name, category) pair or duplicate slug.
    """
    tag = await tag_repository.get_by_id(db, tag_id)
    if tag is None:
        logger.warning("Tag id=%s not found for update", tag_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag nicht gefunden.")

    resolved_name = name if name is not None else tag.name
    resolved_category = category if category is not None else tag.category

    if (name is not None and name != tag.name) or (category is not None and category != tag.category):
        existing = await tag_repository.get_by_name_and_category(db, resolved_name, resolved_category)
        if existing is not None and existing.id != tag_id:
            logger.warning(
                "Update tag id=%s would conflict with existing id=%s (name='%s', category='%s')",
                tag_id,
                existing.id,
                resolved_name,
                resolved_category,
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Tag '{resolved_name}' in Kategorie '{resolved_category}' existiert bereits.",
            )

    if slug is not None and slug != tag.slug:
        if await tag_repository.slug_exists(db, slug, exclude_id=tag_id):
            logger.warning(
                "Update tag id=%s would conflict with existing slug '%s'",
                tag_id,
                slug,
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Slug '{slug}' ist bereits vergeben.",
            )
        tag.slug = slug

    if color_token is not None:
        try:
            ColorToken(color_token)
        except ValueError:
            logger.warning("Invalid color_token '%s' for tag id=%s", color_token, tag_id, exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ungültiges Color-Token: '{color_token}'.",
            ) from None
        tag.color_token = color_token

    if name is not None:
        tag.name = name
    if category is not None:
        tag.category = category
    if description is not None:
        tag.description = description
    if sort_order is not None:
        tag.sort_order = sort_order
    if scope is not None:
        tag.scope = scope

    return await tag_repository.update(db, tag)


async def delete_tag(db: AsyncSession, tag_id: int) -> None:
    """Delete a tag, failing with 409 if it is still in use.

    Raises:
        HTTPException 404: Tag not found.
        HTTPException 409: Tag has usage_count > 0.
    """
    tag = await tag_repository.get_by_id(db, tag_id)
    if tag is None:
        logger.warning("Tag id=%s not found for delete", tag_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag nicht gefunden.")

    count = await taggable_repository.get_usage_count(db, tag_id)
    if count > 0:
        logger.warning(
            "Cannot delete tag id=%s – used by %s entities",
            tag_id,
            count,
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tag wird von {count} Entitäten verwendet und kann nicht gelöscht werden.",
        )

    await tag_repository.delete(db, tag)
