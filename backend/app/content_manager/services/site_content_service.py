"""Service layer for core_site_content – bilingual key-value management.

The service orchestrates over ``SiteContentOut`` DTOs; every SQLAlchemy/ORM
concern lives in ``site_content_repository`` (Achse 2: ``services`` >
``repositories``).
"""

from app.content_manager.repositories import site_content_repository
from app.content_manager.schemas.site_content_schemas import SiteContentOut
from app.shared.db_access.session_types import AsyncSession


async def get_all(db: AsyncSession) -> list[SiteContentOut]:
    """Return all site content rows ordered by key and language.

    Args:
        db: Active async database session.

    Returns:
        List of SiteContentOut with all key/language pairs.
    """
    return await site_content_repository.get_all(db)


async def get_by_language(db: AsyncSession, lang: str) -> dict[str, str]:
    """Return all non-empty key-value pairs for a given language.

    Only keys whose value is not NULL and not an empty string are included.

    Args:
        db: Active async database session.
        lang: Language code, e.g. 'de' or 'en'.

    Returns:
        Dict mapping key to value for the given language.
    """
    return await site_content_repository.get_by_language(db, lang)


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
    return await site_content_repository.upsert(db, key, language, value)
