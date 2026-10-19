"""Business logic for polymorphic Taggable operations (gjo_se_com)."""

import logging

from fastapi import HTTPException, status

from app.shared.db_access.session_types import AsyncSession
from app.shared.tagging.domain.tag_contract import TaggableRecord
from app.shared.tagging.repositories import tag_repository, taggable_repository

logger = logging.getLogger(__name__)


async def set_tags(db: AsyncSession, taggable_type: str, taggable_id: int, tag_ids: list[int]) -> None:
    """Replace all tag assignments for a taggable entity.

    Validates that all tag_ids reference existing tags AND that each tag's
    scope includes the given taggable_type (scope IS NULL = globally available).

    Raises:
        HTTPException 400: One or more tag_ids are invalid or out of scope.
    """
    if tag_ids:
        existing = await tag_repository.get_all(db)
        valid_ids = {t.id for t in existing}
        invalid = [tid for tid in tag_ids if tid not in valid_ids]
        if invalid:
            logger.warning(
                "Invalid tag_ids %s for %s/%s",
                invalid,
                taggable_type,
                taggable_id,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ungültige Tag-IDs: {invalid}",
            )
        # Scope validation: tag must include this taggable_type in its scope
        out_of_scope = [
            tid
            for tid in tag_ids
            if (tag := next((t for t in existing if t.id == tid), None))
            and tag.scope is not None
            and taggable_type not in tag.scope
        ]
        if out_of_scope:
            logger.warning(
                "Out-of-scope tag_ids %s for %s/%s",
                out_of_scope,
                taggable_type,
                taggable_id,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tags {out_of_scope} sind nicht für '{taggable_type}' freigegeben.",
            )

    await taggable_repository.set_tags(db, taggable_type, taggable_id, tag_ids)


async def get_tags(db: AsyncSession, taggable_type: str, taggable_id: int) -> list[TaggableRecord]:
    """Return junction rows with core_tag metadata eagerly loaded."""
    return await taggable_repository.get_tags(db, taggable_type, taggable_id)


async def get_tag_usage(db: AsyncSession, tag_id: int) -> list[tuple[str, int]]:
    """Return (taggable_type, count) pairs for a given tag."""
    return await taggable_repository.get_usage_by_tag(db, tag_id)
