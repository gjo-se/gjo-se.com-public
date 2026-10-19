"""Database access for content_manager site content (gjo_se_com).

Read/write operations return ``SiteContentOut`` DTOs (never ORM models) so the
service layer stays free of ``app.content_manager.models`` imports
(Achse 2: ``services`` > ``repositories``).
"""

from datetime import UTC, datetime

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.content_manager.models.site_content import SiteContent
from app.content_manager.schemas.site_content_schemas import SiteContentOut

logger = structlog.get_logger(__name__)


def _to_out(row: SiteContent) -> SiteContentOut:
    """Maps a site-content ORM row to its DTO.

    Args:
        row: The persisted ``SiteContent`` row.

    Returns:
        The read DTO handed to the service layer.
    """
    return SiteContentOut.model_validate(row)


async def get_all(db: AsyncSession) -> list[SiteContentOut]:
    """Return all site content rows ordered by key and language.

    Args:
        db: Active async database session.

    Returns:
        List of SiteContentOut with all key/language pairs.
    """
    result = await db.execute(select(SiteContent).order_by(SiteContent.key, SiteContent.language))
    rows = result.scalars().all()
    return [_to_out(row) for row in rows]


async def get_by_language(db: AsyncSession, lang: str) -> dict[str, str]:
    """Return all non-empty key-value pairs for a given language.

    Only keys whose value is not NULL and not an empty string are included.

    Args:
        db: Active async database session.
        lang: Language code, e.g. 'de' or 'en'.

    Returns:
        Dict mapping key to value for the given language.
    """
    result = await db.execute(
        select(SiteContent).where(
            SiteContent.language == lang,
            SiteContent.value.isnot(None),
            SiteContent.value != "",
        )
    )
    rows = result.scalars().all()
    return {row.key: row.value for row in rows if row.value}


async def upsert(db: AsyncSession, key: str, language: str, value: str) -> SiteContentOut:
    """Create or update a site content value for the given key and language.

    Args:
        db: Active async database session.
        key: Content key, e.g. 'home.hero.headline'.
        language: Language code, e.g. 'de' or 'en'.
        value: The text value to store.

    Returns:
        SiteContentOut for the upserted row.
    """
    result = await db.execute(
        select(SiteContent).where(
            SiteContent.key == key,
            SiteContent.language == language,
        )
    )
    row = result.scalar_one_or_none()

    if row is None:
        row = SiteContent(key=key, language=language, value=value)
        db.add(row)
        logger.info("SiteContent: created key='%s' lang='%s'", key, language)
    else:
        row.value = value
        row.updated_at = datetime.now(UTC)
        logger.info("SiteContent: updated key='%s' lang='%s'", key, language)

    await db.commit()
    await db.refresh(row)
    return _to_out(row)
