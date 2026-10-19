"""FastAPI router for SearchTerm endpoints (FBF domain).

Admin (mounted unter /api/v1/admin/fbf via router.py):
    GET    /search-term        – List all SearchTerms (incl. inactive)
    POST   /search-term        – Create a SearchTerm
    PUT    /search-term/{id}   – Update SearchTerm (name)
    DELETE /search-term/{id}   – Delete SearchTerm
Public (mounted unter /api/v1/public/fbf via router.py):
    GET    /search-term        – Active SearchTerms (for FE dropdown)
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.schemas.search_term_schemas import (
    SearchTermAdminOut,
    SearchTermCreate,
    SearchTermOut,
    SearchTermUpdate,
)
from app.fbf.services import search_term_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

public_router = APIRouter()
admin_router = APIRouter()


# ── Admin ─────────────────────────────────────────────────────────────────────


@admin_router.get(
    "/search-term",
    response_model=list[SearchTermAdminOut],
    summary="Alle SearchTerms abrufen (Admin)",
)
async def list_search_terms(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[SearchTermAdminOut]:
    """Returns all SearchTerms – including inactive entries."""
    terms_with_counts = await search_term_service.list_all_with_counts(db)
    return [
        SearchTermAdminOut.model_validate(term).model_copy(
            update={
                "reference_count": count,
                "status": status_name,
                "status_color_token": status_color,
            },
        )
        for term, count, status_name, status_color in terms_with_counts
    ]


@admin_router.post(
    "/search-term",
    response_model=SearchTermOut,
    status_code=status.HTTP_201_CREATED,
    summary="SearchTerm anlegen (Admin)",
)
async def create_search_term(
    body: SearchTermCreate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> SearchTermOut:
    """Creates a new search term.

    Raises:
        HTTPException 409: Name already taken.
    """
    return await search_term_service.create(db, name=body.name)


@admin_router.put(
    "/search-term/{search_term_id}",
    response_model=SearchTermOut,
    summary="SearchTerm bearbeiten (Admin)",
)
async def update_search_term(
    search_term_id: int,
    body: SearchTermUpdate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> SearchTermOut:
    """Updates a SearchTerm's name.

    Raises:
        HTTPException 404: SearchTerm not found.
        HTTPException 409: Name already taken.
    """
    return await search_term_service.update(
        db,
        search_term_id=search_term_id,
        name=body.name,
    )


@admin_router.delete(
    "/search-term/{search_term_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="SearchTerm löschen (Admin)",
)
async def delete_search_term(
    search_term_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> None:
    """Permanently deletes a SearchTerm.

    Raises:
        HTTPException 404: SearchTerm not found.
    """
    await search_term_service.delete(db, search_term_id=search_term_id)


# ── Public ────────────────────────────────────────────────────────────────────


@public_router.get(
    "/search-term",
    response_model=list[SearchTermOut],
    summary="Aktive SearchTerms abrufen (oeffentlich)",
)
async def list_active_search_terms(
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[SearchTermOut]:
    """Returns all active SearchTerms (for FE dropdown)."""
    return await search_term_service.list_active(db)
