"""AIScope ``Project`` service facade and analysis-cache orchestration.

The former god-file was split into focused modules (score · query · write ·
chart). This module re-exports their public surface so consumers keep importing
``app.fbf.services.project_service`` unchanged, and owns the small orchestration
that composes the chart datasets into the analysis cache.
"""

import datetime
from datetime import UTC
from typing import Any

from app.fbf.repositories import (
    project_repository,
    skill_repository,
)
from app.fbf.schemas.chart_schemas import TrendPointOut
from app.fbf.services.analysis_cache_service import write_cache
from app.fbf.services.project_chart_service import (
    TREND_WINDOWS,
    chart_bar,
    chart_delta,
    chart_impact,
    chart_monthly_projects,
    chart_radar,
    chart_swing,
    chart_trend,
)
from app.fbf.services.project_query_service import (
    count,
    get_by_id,
    get_neighbors,
    list_all,
    list_slaves,
    row_to_project_out,
)
from app.fbf.services.project_score_service import (
    _compute_match_score,
    compute_public_score,
    public_score_from_skills,
    recalculate_all_scores,
    recalculate_match_score,
    simulate_score,
)
from app.fbf.services.project_write_service import (
    archive_stale_projects,
    clear_status,
    create,
    delete,
    move_status,
    set_status,
)
from app.shared.db_access.session_types import AsyncSession

__all__ = [
    "TREND_WINDOWS",
    "_compute_match_score",
    "_compute_trend_all",
    "archive_stale_projects",
    "chart_bar",
    "chart_delta",
    "chart_impact",
    "chart_monthly_projects",
    "chart_radar",
    "chart_swing",
    "chart_trend",
    "clear_status",
    "compute_analysis_cache",
    "compute_public_score",
    "count",
    "create",
    "delete",
    "get_by_id",
    "get_neighbors",
    "list_all",
    "list_slaves",
    "move_status",
    "project_repository",
    "public_score_from_skills",
    "recalculate_all_scores",
    "recalculate_match_score",
    "row_to_project_out",
    "set_status",
    "simulate_score",
    "skill_repository",
]


async def _compute_trend_all(
    db: AsyncSession,
    weeks: int = 4,
) -> list[TrendPointOut]:
    """Compute trend chart data for all confirmed skills.

    Used by the cache layer so the FE can filter client-side."""
    all_ids = await skill_repository.get_active_skill_ids(db)
    if not all_ids:
        return []
    return await chart_trend(db, skill_ids=all_ids, window="month")


async def compute_analysis_cache(
    db: AsyncSession,
    weeks: int = 4,
    threshold: float = 75,
    target_level: int = 4,
) -> dict[str, Any]:
    """Compute all four analysis datasets and update the JSON cache.

    Returns the combined dict (also persisted to disk)."""
    impact_data = await chart_impact(db, weeks=weeks)
    swing_data = await chart_swing(db, weeks=weeks, threshold=threshold, target_level=target_level)
    delta_data = await chart_delta(db, weeks=weeks, target_level=target_level)
    trend_data = await _compute_trend_all(db, weeks=weeks)
    monthly_data = await chart_monthly_projects(db, threshold=threshold)

    cache = {
        "computed_at": datetime.datetime.now(UTC).isoformat(),
        "weeks": weeks,
        "threshold": threshold,
        "target_level": target_level,
        "impact": [p.model_dump(mode="json") for p in impact_data],
        "swing": swing_data,
        "delta": delta_data,
        "trend": [t.model_dump(mode="json") for t in trend_data],
        "monthly": monthly_data,
    }
    write_cache(cache)
    return cache
