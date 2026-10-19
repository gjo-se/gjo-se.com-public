"""FastAPI routers for portfolio content (gjo_se_com).

Hosts both the public read API (``router``) and the admin CRUD API
(``admin_router``) for portfolio projects in a single resource module.

Public routes (registered under ``/portfolio``):
    GET ""                – list all portfolios (sorted by ``sort``)
    GET /{slug}           – portfolio detail (404 on unknown slug)
    GET /{slug}/proofs    – portfolio proofs (404 on unknown slug)

Admin routes (registered under ``/admin/portfolio``):
    GET ""            – list all projects with translations
    POST ""           – create a project + translations (201)
    PUT /{slug}       – update a project (slug change allowed) + translations
    DELETE /{slug}    – delete a project (cascades proofs + translations, 204)
"""

import logging

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.portfolio.exceptions import PortfolioNotFoundError, PortfolioSlugConflictError
from app.portfolio.schemas.portfolio_schemas import (
    PortfolioAdminCreate,
    PortfolioAdminOut,
    PortfolioAdminUpdate,
    PortfolioListItemOut,
    PortfolioPublicOut,
    PortfolioReorderRequest,
    PortfolioTranslationUpdate,
)
from app.portfolio.schemas.proof_schemas import ProofOut
from app.portfolio.services import portfolio_admin_service, portfolio_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

logger = logging.getLogger(__name__)

router = APIRouter()
admin_router = APIRouter()

_LOCALE_PATTERN = "^(de|en)$"


# ── Public read API ──────────────────────────────────────────────────────────


@router.get(
    "",
    response_model=list[PortfolioListItemOut],
    summary="List all portfolio projects (public)",
)
async def list_portfolios(
    locale: str = Query(default="de", pattern=_LOCALE_PATTERN),
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[PortfolioListItemOut]:
    """Returns all portfolios sorted by ``sort`` ASC, localized.

    Args:
        locale: Requested locale (``de`` or ``en``).
        db: Database connection.

    Returns:
        List of localized portfolio cards.
    """
    return await portfolio_service.list_portfolios(db, locale)


@router.get(
    "/{slug}",
    response_model=PortfolioPublicOut,
    summary="Get portfolio detail (public)",
)
async def get_portfolio(
    slug: str,
    locale: str = Query(default="de", pattern=_LOCALE_PATTERN),
    db: AsyncSession = Depends(get_gjo_se_db),
) -> PortfolioPublicOut:
    """Returns a single portfolio detail (header), localized.

    Args:
        slug: Globally unique portfolio slug.
        locale: Requested locale (``de`` or ``en``).
        db: Database connection.

    Returns:
        PortfolioPublicOut with localized header fields.

    Raises:
        HTTPException 404: If no portfolio with the given slug exists.
    """
    try:
        return await portfolio_service.get_portfolio(db, slug, locale)
    except PortfolioNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Portfolio '{slug}' not found",
        ) from exc


@router.get(
    "/{slug}/proofs",
    response_model=list[ProofOut],
    summary="Get portfolio proofs (public)",
)
async def get_proofs(
    slug: str,
    locale: str = Query(default="de", pattern=_LOCALE_PATTERN),
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[ProofOut]:
    """Returns the proofs of a portfolio sorted by ``sort`` ASC, localized.

    Args:
        slug: Globally unique portfolio slug.
        locale: Requested locale (``de`` or ``en``).
        db: Database connection.

    Returns:
        List of ProofOut sorted by ``sort`` ASC.

    Raises:
        HTTPException 404: If no portfolio with the given slug exists.
    """
    try:
        return await portfolio_service.get_proofs(db, slug, locale)
    except PortfolioNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Portfolio '{slug}' not found",
        ) from exc


# ── Admin write API ──────────────────────────────────────────────────────────


@admin_router.get(
    "",
    response_model=list[PortfolioAdminOut],
    summary="List paginated portfolio projects (admin)",
)
async def list_portfolios_admin(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    q: str | None = Query(default=None, description="Search term for slug or German title"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=5000),
    sort_by: str = Query(
        default="sort",
        description="Sort field: slug, link_url, link_label, year, sort, title",
    ),
    sort_order: str = Query(
        default="asc",
        pattern="^(asc|desc)$",
        description="Sort direction",
    ),
) -> list[PortfolioAdminOut]:
    """Returns a paginated page of projects with structure fields and translations."""
    return await portfolio_admin_service.list_portfolios(
        db,
        q=q,
        offset=offset,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@admin_router.get(
    "/count",
    summary="Count portfolio projects (admin)",
)
async def count_portfolios(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    q: str | None = Query(default=None, description="Search term for slug or German title"),
) -> int:
    """Returns the total count of projects, optionally filtered by search."""
    return await portfolio_admin_service.count_portfolios(db, q=q)


@admin_router.patch(
    "/reorder",
    response_model=list[PortfolioAdminOut],
    summary="Reorder portfolio projects (admin)",
)
async def reorder_portfolios(
    _: AdminUser,
    body: PortfolioReorderRequest,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[PortfolioAdminOut]:
    """Sets ``sort`` from ``ordered_slugs`` (index = sort) and returns the re-sorted list."""
    result = await portfolio_admin_service.reorder_portfolios(db, body)
    await db.commit()
    return result


@admin_router.get(
    "/{slug}",
    response_model=PortfolioAdminOut,
    summary="Get a portfolio project with translations (admin)",
)
async def get_portfolio_admin(
    _: AdminUser,
    slug: str,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> PortfolioAdminOut:
    """Returns a single portfolio with structure fields and translations; 404 on unknown slug."""
    try:
        portfolio = await portfolio_admin_service.get_portfolio(db, slug)
    except PortfolioNotFoundError as exc:
        logger.warning("portfolio get failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    return portfolio_admin_service.to_admin_out(portfolio)


@admin_router.post(
    "",
    response_model=PortfolioAdminOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a portfolio project (admin)",
)
async def create_portfolio(
    _: AdminUser,
    body: PortfolioAdminCreate,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> PortfolioAdminOut:
    """Creates a project + DE/EN translations; 409 on slug collision, 422 on missing DE."""
    try:
        portfolio = await portfolio_admin_service.create_portfolio(db, body)
    except PortfolioSlugConflictError as exc:
        logger.exception("portfolio create failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        logger.exception("portfolio create validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    await db.commit()
    return await _load_admin_out(db, portfolio.slug)


@admin_router.put(
    "/{slug}",
    response_model=PortfolioAdminOut,
    summary="Update a portfolio project (admin)",
)
async def update_portfolio(
    _: AdminUser,
    slug: str,
    body: PortfolioAdminUpdate,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> PortfolioAdminOut:
    """Updates a project (slug change allowed); 404 unknown, 409 collision, 422 missing DE."""
    try:
        portfolio = await portfolio_admin_service.update_portfolio(db, slug, body)
    except PortfolioNotFoundError as exc:
        logger.warning("portfolio update failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except PortfolioSlugConflictError as exc:
        logger.exception("portfolio update failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        logger.exception("portfolio update validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    await db.commit()
    return await _load_admin_out(db, portfolio.slug)


@admin_router.put(
    "/{slug}/translations/{locale}",
    response_model=PortfolioAdminOut,
    summary="Update one translation of a portfolio (admin)",
)
async def update_translation(
    _: AdminUser,
    slug: str,
    locale: str = Path(..., pattern=_LOCALE_PATTERN),
    body: PortfolioTranslationUpdate = Body(...),
    db: AsyncSession = Depends(get_gjo_se_db),
) -> PortfolioAdminOut:
    """Partially updates the translation row for *locale*; 404 unknown slug."""
    try:
        portfolio = await portfolio_admin_service.update_translation(db, slug, locale, body)
    except PortfolioNotFoundError as exc:
        logger.warning("translation update failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    await db.commit()
    return await _load_admin_out(db, portfolio.slug)


@admin_router.delete(
    "/{slug}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a portfolio project (admin)",
)
async def delete_portfolio(
    _: AdminUser,
    slug: str,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> None:
    """Deletes a project; proofs + translations cascade; 404 on unknown slug."""
    try:
        await portfolio_admin_service.delete_portfolio(db, slug)
    except PortfolioNotFoundError as exc:
        logger.warning("portfolio delete failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    await db.commit()


async def _load_admin_out(db: AsyncSession, slug: str) -> PortfolioAdminOut:
    """Reloads a portfolio by slug after commit and serializes it as admin DTO.

    Args:
        db: Active async DB session.
        slug: Slug of the created/updated portfolio.

    Returns:
        The freshly loaded PortfolioAdminOut.

    Raises:
        PortfolioNotFoundError: If the portfolio vanished (defensive).
    """
    portfolio = await portfolio_admin_service.get_portfolio(db, slug)
    return portfolio_admin_service.to_admin_out(portfolio)
