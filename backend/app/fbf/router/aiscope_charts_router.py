"""Aiscope admin endpoints: charts and analysis cache."""

from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.schemas.aiscope_router_schemas import MonthlyProjectPointOut
from app.fbf.schemas.chart_schemas import (
    BarPointOut,
    DeltaPointOut,
    ImpactPointOut,
    RadarPointOut,
    SwingPointOut,
    TrendPointOut,
)
from app.fbf.services import (
    project_service,
)
from app.fbf.services.analysis_cache_service import read_cache
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

logger = structlog.get_logger(__name__)


router = APIRouter()


@router.get(
    "/charts/radar",
    response_model=list[RadarPointOut],
    summary="Radar-Chart-Daten: Soll (importance) vs. Ist (level) je Skill (Admin)",
)
async def chart_radar(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    role_id: int | None = Query(default=None, description="Filter by job role (JobRole.id)."),
    top_n: int = Query(default=10, ge=1, le=50, description="Maximum number of skills (axes)."),
) -> list[RadarPointOut]:
    """Returns Soll/Ist radar data (importance vs. level) for the Top-N skills.

    Args:
        _: Admin user (via dependency).
        db: Database connection.
        role_id: Optional job role filter.
        top_n: Maximum number of skills.

    Returns:
        Radar points ordered by importance DESC.
    """
    return await project_service.chart_radar(db, role_id=role_id, top_n=top_n)


@router.get(
    "/charts/bar",
    response_model=list[BarPointOut],
    summary="Bar-Chart-Daten: Top-N Skills nach importance (Admin)",
)
async def chart_bar(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    role_id: int | None = Query(default=None, description="Filter by job role (JobRole.id)."),
    top_n: int = Query(default=20, ge=1, le=100, description="Maximum number of skills."),
) -> list[BarPointOut]:
    """Returns the Top-N skills by importance (market-demand bar chart).

    Args:
        _: Admin user (via dependency).
        db: Database connection.
        role_id: Optional job role filter.
        top_n: Maximum number of skills.

    Returns:
        Bar points ordered by importance DESC.
    """
    return await project_service.chart_bar(db, role_id=role_id, top_n=top_n)


@router.get(
    "/charts/trend",
    response_model=list[TrendPointOut],
    summary="Trend-Chart-Daten: relative Skill-Haeufigkeit ueber Zeit (Admin)",
)
async def chart_trend(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    skill_ids: str = Query(default="", description="Comma-separated skill ids (ignored when cache is available)."),
    role_id: int | None = Query(default=None),
    window: str = Query(default="month", description="Time bucket: day, week, month, quarter, year."),
) -> list[TrendPointOut]:
    """Cached trend data for all confirmed skills (falls back to live)."""
    cache = read_cache()
    if cache and "trend" in cache:
        return [TrendPointOut(**t) for t in cache["trend"]]  # type: ignore[misc]
    if not skill_ids:
        return []
    if window not in project_service.TREND_WINDOWS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid window '{window}'.")
    try:
        parsed_ids = [int(part) for part in skill_ids.split(",") if part.strip()]
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="skill_ids must be comma-separated integers."
        ) from exc
    return await project_service.chart_trend(db, skill_ids=parsed_ids, role_id=role_id, window=window)


# ── Analysis Cache Refresh ──────────────────────────────────────────────────


@router.post(
    "/analysis/refresh",
    status_code=status.HTTP_200_OK,
    summary="Analyse-Cache neu berechnen (Admin)",
)
async def analysis_refresh(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> dict[str, Any]:
    """Compute all four analysis datasets and persist to the JSON cache."""
    cache = await project_service.compute_analysis_cache(db)
    return {"updated": True, "computed_at": cache["computed_at"]}


# ── Impact-Ranking ────────────────────────────────────────────────────────────


@router.get(
    "/charts/impact",
    response_model=list[ImpactPointOut],
    status_code=status.HTTP_200_OK,
    summary="Skill-Impact-Ranking – Lern-Empfehlung nach Hebel (Admin)",
)
async def chart_impact(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    top_n: int = Query(default=50, ge=1, le=200),
) -> list[ImpactPointOut]:
    """Cached impact ranking (falls back to live)."""
    cache = read_cache()
    if cache and "impact" in cache:
        items = cache["impact"][:top_n]
        return [ImpactPointOut(**i) for i in items]  # type: ignore[misc]
    return await project_service.chart_impact(db, top_n=top_n)


# ── Swing-Analyse ────────────────────────────────────────────────────────────


@router.get(
    "/charts/swing",
    response_model=list[SwingPointOut],
    status_code=status.HTTP_200_OK,
    summary="Swing-Analyse – wie viele Projekte springen ueber die Schwelle (Admin)",
)
async def chart_swing(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    weeks: int = Query(default=4, ge=1, le=52),
    threshold: float = Query(default=75, ge=0, le=100),
    target_level: int = Query(default=4, ge=1, le=5),
) -> list[SwingPointOut]:
    """Cached swing analysis (falls back to live)."""
    cache = read_cache()
    if cache and "swing" in cache and cache.get("weeks") == weeks:
        return [SwingPointOut(**s) for s in cache["swing"]]  # type: ignore[misc]
    results = await project_service.chart_swing(
        db,
        weeks=weeks,
        threshold=threshold,
        target_level=target_level,
    )
    return [SwingPointOut(**r) for r in results]  # type: ignore[misc]


# ── Delta-Analyse ────────────────────────────────────────────────────────────


@router.get(
    "/charts/delta",
    response_model=list[DeltaPointOut],
    status_code=status.HTTP_200_OK,
    summary="Delta-Analyse – durchschnittlicher Score-Gewinn je Skill (Admin)",
)
async def chart_delta(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    weeks: int = Query(default=4, ge=1, le=52),
    target_level: int = Query(default=4, ge=1, le=5),
) -> list[DeltaPointOut]:
    """Cached delta analysis (falls back to live)."""
    cache = read_cache()
    if cache and "delta" in cache and cache.get("weeks") == weeks:
        return [DeltaPointOut(**d) for d in cache["delta"]]  # type: ignore[misc]
    results = await project_service.chart_delta(
        db,
        weeks=weeks,
        target_level=target_level,
    )
    return [DeltaPointOut(**r) for r in results]  # type: ignore[misc]


# ── Monthly Projects Chart ────────────────────────────────────────────────────


@router.get(
    "/charts/monthly",
    response_model=list[MonthlyProjectPointOut],
    status_code=status.HTTP_200_OK,
    summary="Projekt-Volumen/Monat vs. passende Projekte/Monat (Admin)",
)
async def chart_monthly(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    threshold: float = Query(default=75.0, ge=0, le=100),
) -> list[MonthlyProjectPointOut]:
    """Cached monthly chart (falls back to live)."""
    cache = read_cache()
    if cache and "monthly" in cache:
        return [MonthlyProjectPointOut(**m) for m in cache["monthly"]]  # type: ignore[misc]
    results = await project_service.chart_monthly_projects(db, threshold=threshold)
    return [MonthlyProjectPointOut(**r) for r in results]  # type: ignore[misc]


# ── Dedup Health Check ────────────────────────────────────────────────────────
