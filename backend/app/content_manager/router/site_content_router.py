"""FastAPI routers for core_site_content – public JSON API + admin CRUD."""

import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.content_manager.schemas.site_content_schemas import (
    SiteContentOut,
    SiteContentUpdate,
)
from app.content_manager.services import site_content_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()
admin_router = APIRouter()
logger = structlog.get_logger(__name__)


@router.get(
    "/{lang}",
    summary="Get all site content for a language",
)
async def get_content_by_language(
    lang: str,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> dict[str, str]:
    """Return all non-empty key-value pairs for the given language.

    Args:
        lang: Language code, currently 'de' or 'en'.

    Returns:
        JSON object mapping content keys to their values.
        Example: ``{"home.hero.headline": "Senior AI Engineer"}``
    """
    return await site_content_service.get_by_language(db, lang)


@admin_router.get(
    "",
    response_model=list[SiteContentOut],
    summary="[Admin] List all site content keys",
)
async def list_site_content(
    _admin: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[SiteContentOut]:
    """Return all site content rows with values for each language."""
    return await site_content_service.get_all(db)


@admin_router.put(
    "/{key}/{language}",
    response_model=SiteContentOut,
    summary="[Admin] Update a site content value",
)
async def update_site_content(
    key: str,
    language: str,
    body: SiteContentUpdate,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> SiteContentOut:
    """Create or update the value for a given key and language."""
    return await site_content_service.upsert(db, key, language, body.value)
