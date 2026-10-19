"""FastAPI router for technology catalog operations (admin scope).

Routes:
    GET    /models
    GET    /models/count
    GET    /models/count/icons
    GET    /models/{id}
    PATCH  /models/{id}

Scope is enforced via the router group (``/admin``) – the file and handler
names carry no ``admin_`` prefix (canon B).
"""

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser
from app.shared.technology_catalog.dependencies.technology_catalog_dependencies import (
    get_technology_query_service,
    get_technology_service,
)
from app.shared.technology_catalog.schemas.technology_schemas import (
    TechnologyListCountResponse,
    TechnologyPatchIn,
    TechnologyResponse,
)
from app.shared.technology_catalog.services.technology_service import (
    TechnologyQueryService,
    TechnologyService,
)

logger = structlog.get_logger(__name__)

admin_router = APIRouter()

# Shared query parameter descriptions
_PARAM_Q = Query(default=None, description="Suche in name, slug (ILIKE)")
_PARAM_PROVIDER = Query(default=None, description="Filter: aws, azure, gcp, ...")
_PARAM_TYPE = Query(default=None, alias="type", description="Filter: language, framework-library, ...")
_PARAM_STATUS = Query(default=None, description="Filter: approved, pending, deprecated, ...")
_PARAM_SORT_BY = Query(default=None, description="Sortierung: id, slug, name, provider, type, created_at")
_PARAM_SORT_DIR = Query(default=None, description="Richtung: asc, desc")
_PARAM_OFFSET = Query(default=0, ge=0, description="Pagination Offset")
_PARAM_LIMIT = Query(default=20, ge=1, le=500, description="Pagination Limit")


@admin_router.get(
    "/models",
    response_model=list[TechnologyResponse],
    summary="[Admin] List technologies (server-side filters, sort, pagination)",
    tags=["technology-catalog · models · admin"],
)
async def list_technologies(
    _admin: AdminUser,
    q: str | None = _PARAM_Q,
    provider: str | None = _PARAM_PROVIDER,
    technology_type: str | None = _PARAM_TYPE,
    status: str | None = _PARAM_STATUS,
    sort_by: str | None = _PARAM_SORT_BY,
    sort_dir: str | None = _PARAM_SORT_DIR,
    offset: int = _PARAM_OFFSET,
    limit: int = _PARAM_LIMIT,
    db: AsyncSession = Depends(get_gjo_se_db),
    technology_query_service: TechnologyQueryService = Depends(get_technology_query_service),
) -> list[TechnologyResponse]:
    """Return paginated technology catalog entries with SQL-level filtering.

    All filter parameters are optional. Pagination via offset/limit.
    """
    return await technology_query_service.list_all(
        db,
        q=q,
        provider=provider,
        technology_type=technology_type,
        status=status,
        sort_by=sort_by or "name",
        sort_dir=sort_dir or "asc",
        offset=offset,
        limit=limit,
    )


@admin_router.get(
    "/models/count",
    response_model=TechnologyListCountResponse,
    summary="[Admin] Count technologies matching filters",
    tags=["technology-catalog · models · admin"],
)
async def count_technologies(
    _admin: AdminUser,
    q: str | None = _PARAM_Q,
    provider: str | None = _PARAM_PROVIDER,
    technology_type: str | None = _PARAM_TYPE,
    status: str | None = _PARAM_STATUS,
    db: AsyncSession = Depends(get_gjo_se_db),
    technology_query_service: TechnologyQueryService = Depends(get_technology_query_service),
) -> TechnologyListCountResponse:
    """Return count of technologies matching the given filters."""
    total = await technology_query_service.count(
        db,
        q=q,
        provider=provider,
        technology_type=technology_type,
        status=status,
    )
    return TechnologyListCountResponse(total=total)


@admin_router.get(
    "/models/count/icons",
    summary="[Admin] Icon counts – total/loaded/missing across whole DB",
    tags=["technology-catalog · models · admin"],
)
async def count_icons(
    _admin: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> dict[str, int]:
    """Return total, loaded and missing icon counts across all technologies."""
    from sqlalchemy import func, select

    from app.shared.technology_catalog.models.technology import Technology
    from app.shared.technology_catalog.models.technology_icon import TechnologyIcon

    total_q = select(func.count()).select_from(Technology)
    total = (await db.scalar(total_q)) or 0

    loaded_q = (
        select(func.count(func.distinct(Technology.id)))
        .select_from(Technology)
        .join(TechnologyIcon, TechnologyIcon.core_technology_catalog_id == Technology.id)
        .where(TechnologyIcon.downloaded_at.isnot(None))
    )
    loaded = (await db.scalar(loaded_q)) or 0

    return {"total": total, "loaded": loaded, "missing": total - loaded}


@admin_router.get(
    "/models/{model_id}",
    response_model=TechnologyResponse,
    summary="[Admin] Get single technology by id",
    tags=["technology-catalog · models · admin"],
)
async def get_technology(
    _admin: AdminUser,
    model_id: int,
    db: AsyncSession = Depends(get_gjo_se_db),
    technology_service: TechnologyService = Depends(get_technology_service),
) -> TechnologyResponse:
    """Return a single technology record by its primary key."""
    try:
        return await technology_service.get_by_id(db, model_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@admin_router.patch(
    "/models/{model_id}",
    response_model=TechnologyResponse,
    summary="[Admin] Patch technology (partial update)",
    tags=["technology-catalog · models · admin"],
)
async def patch_technology(
    _admin: AdminUser,
    model_id: int,
    body: TechnologyPatchIn,
    db: AsyncSession = Depends(get_gjo_se_db),
    technology_service: TechnologyService = Depends(get_technology_service),
) -> TechnologyResponse:
    """Partially update a technology – only provided fields are applied."""
    try:
        return await technology_service.patch(db, model_id, body)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
