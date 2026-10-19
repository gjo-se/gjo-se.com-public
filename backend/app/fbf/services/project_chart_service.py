"""Chart and analysis datasets for AIScope projects.

Extracted from the former monolithic ``project_service`` (god-file split). Holds
the read-only chart/analysis computations (radar, bar, trend, impact, swing,
delta, monthly volume) and the combined analysis-cache orchestration.
"""

import datetime
from datetime import UTC, timedelta
from typing import Any

from app.fbf.repositories import (
    project_repository,
    skill_repository,
)
from app.fbf.repositories.skill_repository import SkillFilter, SkillRef
from app.fbf.schemas.chart_schemas import (
    BarPointOut,
    ImpactPointOut,
    RadarPointOut,
    TrendPointOut,
)
from app.fbf.services.project_score_service import _compute_match_score, simulate_score
from app.fbf.services.skill_service import effective_importance
from app.shared.db_access.session_types import AsyncSession

# Whitelisted date_trunc windows for the trend chart (guards the SQL bind value).
TREND_WINDOWS = frozenset({"day", "week", "month", "quarter", "year"})
_DEFAULT_TREND_WINDOW = "month"


async def chart_radar(db: AsyncSession, role_id: int | None = None, top_n: int = 10) -> list[RadarPointOut]:
    """Returns the Soll/Ist radar data: importance vs. level per skill.

    Selects the Top-N canonical skills by ``importance``. When ``role_id`` is
    set, only skills actually linked to master projects of that job role are
    considered; otherwise all canonical skills are ranked.

    Args:
        db: Database connection.
        role_id: Optional job role filter (``JobRole.id``).
        top_n: Maximum number of skills (axes).

    Returns:
        Radar points ordered by ``importance`` DESC.
    """
    skills = await skill_repository.get_ranked_skills(db, top_n=top_n, role_id=role_id)
    return [
        RadarPointOut(
            skill_id=skill.id,
            skill_name=skill.name,
            importance=skill.importance,
            level=skill.level,
        )
        for skill in skills
    ]


async def chart_bar(db: AsyncSession, role_id: int | None = None, top_n: int = 20) -> list[BarPointOut]:
    """Returns the Top-N skills by ``importance`` (market-demand bar chart).

    Args:
        db: Database connection.
        role_id: Optional job role filter (``JobRole.id``).
        top_n: Maximum number of skills.

    Returns:
        Bar points ordered by ``importance`` DESC.
    """
    skills = await skill_repository.get_ranked_skills(db, top_n=top_n, role_id=role_id)
    return [BarPointOut(skill_id=skill.id, skill_name=skill.name, importance=skill.importance) for skill in skills]


async def chart_trend(
    db: AsyncSession,
    skill_ids: list[int],
    role_id: int | None = None,
    window: str = _DEFAULT_TREND_WINDOW,
) -> list[TrendPointOut]:
    """Returns the relative skill frequency per time window (on-the-fly).

    For each ``date_trunc(window, posted_at)`` bucket, computes the share of
    master projects mentioning a given skill relative to all master projects in
    that bucket. Only masters (``canonical_id IS NULL``) with a ``posted_at``
    are counted; an optional ``role_id`` restricts the master population.

    Args:
        db: Database connection.
        skill_ids: Canonical skill ids to track (empty → no rows).
        role_id: Optional job role filter (``JobRole.id``).
        window: ``date_trunc`` unit (one of :data:`TREND_WINDOWS`).

    Returns:
        Trend points ordered by ``window_start`` then ``skill_name``.
    """
    if not skill_ids:
        return []
    if window not in TREND_WINDOWS:
        window = _DEFAULT_TREND_WINDOW
    return await skill_repository.get_trend_points(
        db,
        skill_ids=skill_ids,
        window=window,
        role_id=role_id,
    )


async def chart_impact(
    db: AsyncSession,
    top_n: int = 100,
    target_level: int = 4,
    threshold: float = 75.0,
    weeks: int = 4,
) -> list[ImpactPointOut]:
    """Returns a ranked list of confirmed skills by learning impact.

    Impact formula:
        ``blended_importance × project_count × max(5 − level, 1)``

    Match simulation is scoped to the last *weeks* weeks – both project_count,
    current_match and simulated_match reflect only master projects posted in
    that window.

    Args:
        db: Database connection.
        top_n: Maximum number of skills to return.
        target_level: Simulated knowledge level for match delta.
        threshold: Match-score threshold (0–100).
        weeks: Look-back window in weeks.

    Returns:
        Impact points ordered by ``impact`` DESC.
    """
    cutoff = datetime.datetime.now(UTC) - datetime.timedelta(weeks=weeks)

    skills_with_counts = await skill_repository.get_paginated_with_counts(
        db,
        filters=SkillFilter(status="active"),
        sort_by="project_count",
        sort_order="desc",
        limit=top_n,
        masters_only=True,
    )

    # ── Preload master projects + scores (last N weeks only) ───────────
    project_scores = await project_repository.get_master_confirmed_scores_since(db, cutoff)

    # Global baseline: projects currently matching (last 4 weeks only)
    current_match_global = sum(1 for s in project_scores.values() if s >= threshold)

    # ── Preload project→skill links (master-resolved, last 4 weeks) ───
    link_pairs = await skill_repository.get_master_skill_project_pairs_since(db, cutoff)
    # skill_id → set of project_ids (only last 4 weeks)
    skill_projects: dict[int, set[int]] = {}
    project_skills_map: dict[int, set[int]] = {}  # project_id → set of skill_ids
    for pid, sid in link_pairs:
        skill_projects.setdefault(sid, set()).add(pid)
        project_skills_map.setdefault(pid, set()).add(sid)

    # ── Project scored_skills cache (lazy, per project) ────────────────
    project_cache: dict[int, list[tuple[SkillRef, float | None, float | None, str | None]]] = {}

    async def _get_project_skills(project_id: int):
        """Return the active scored skills for a project, cached per call.

        Args:
            project_id: Project whose active skills are requested.

        Returns:
            The cached scored-skill rows for *project_id*.
        """
        if project_id not in project_cache:
            project_cache[project_id] = await skill_repository.get_scored_skills(
                db,
                project_id,
                status="active",
            )
        return project_cache[project_id]

    # ── Filter skill list to only those with projects in last 4 weeks ──
    points: list[ImpactPointOut] = []
    for skill, _project_count, avg_importance, _status_name, _status_color in skills_with_counts:
        # Use only projects in last 4 weeks for this skill
        week_proj_ids = skill_projects.get(skill.id, set())
        week_count = len(week_proj_ids)
        if week_count == 0:
            continue

        level = skill.level or 0
        blended = effective_importance(skill, project_importance=None, avg_importance=avg_importance)
        gap = max(5 - level, 1)
        impact = blended * week_count * gap

        # Match simulation: only for skills below target_level
        simulated_match = current_match_global
        if level < target_level:
            for pid in week_proj_ids:
                if pid not in project_scores:
                    continue
                skills_data = await _get_project_skills(pid)
                current_val = float(_compute_match_score(skills_data) or 0)
                simulated_val = float(simulate_score(skills_data, skill.id, target_level) or 0)
                was_below = current_val < threshold
                now_above = simulated_val >= threshold
                if was_below and now_above:
                    simulated_match += 1

        points.append(
            ImpactPointOut(
                skill_id=skill.id,
                skill_name=skill.name,
                project_count=week_count,
                avg_importance=avg_importance,
                curated_importance=skill.importance,
                blended_importance=round(blended, 2),
                level=skill.level,
                impact=round(impact, 2),
                current_match=current_match_global,
                simulated_match=simulated_match,
                match_delta=simulated_match - current_match_global,
            )
        )
    points.sort(key=lambda p: p.impact, reverse=True)
    return points


async def chart_swing(
    db: AsyncSession,
    weeks: int = 4,
    threshold: float = 75,
    target_level: int = 4,
) -> list[dict[str, Any]]:
    """Swing analysis: how many additional projects cross the match
    threshold if a skill is learned to ``target_level``.

    Only confirmed skills whose current ``level < target_level`` are
    evaluated.  Projects from the last ``weeks`` are considered.

    Args:
        db: Database connection.
        weeks: Look-back window in weeks.
        threshold: Match-score threshold (0–100).
        target_level: Simulated knowledge level (0–5).

    Returns:
        List of swing data dicts sorted by ``swing_count`` DESC.
    """
    cutoff = datetime.datetime.now(UTC) - timedelta(weeks=weeks)

    # 1. Confirmed skills below target level
    skills = await skill_repository.get_confirmed_skills_below_level(db, target_level)

    # 2. Project cache: load scored skills once per project
    project_cache: dict[int, list[tuple[SkillRef, float | None, float | None, str | None]]] = {}

    async def _get_project_skills(project_id: int):
        """Return the active scored skills for a project, cached per call.

        Args:
            project_id: Project whose active skills are requested.

        Returns:
            The cached scored-skill rows for *project_id*.
        """
        if project_id not in project_cache:
            project_cache[project_id] = await skill_repository.get_scored_skills(
                db,
                project_id,
                status="active",
            )
        return project_cache[project_id]

    results: list[dict[str, Any]] = []

    for skill in skills:
        # Projects in last N weeks linked to this skill (V2-dedup-aware)
        project_ids = await skill_repository.get_master_project_ids_for_skill_since(db, skill.id, cutoff)

        if not project_ids:
            continue

        total = len(project_ids)
        swing_count = 0
        score_sum = 0.0

        for pid in project_ids:
            skills_data = await _get_project_skills(pid)
            current = _compute_match_score(skills_data)
            simulated = simulate_score(skills_data, skill.id, target_level)

            current_val = float(current) if current is not None else 0.0
            simulated_val = float(simulated) if simulated is not None else 0.0
            score_sum += current_val

            if current_val < threshold <= simulated_val:
                swing_count += 1

        results.append(
            {
                "skill_id": skill.id,
                "skill_name": skill.name,
                "current_level": skill.level,
                "current_avg_score": round(score_sum / total, 1) if total else 0,
                "total_projects": total,
                "swing_count": swing_count,
            }
        )

    results.sort(key=lambda r: r["swing_count"], reverse=True)
    return results


async def chart_delta(
    db: AsyncSession,
    weeks: int = 4,
    target_level: int = 4,
) -> list[dict[str, Any]]:
    """Delta analysis: average score improvement per skill when learned.

    Simulates the ``confirmed_score`` for every project that requires a
    skill and computes the per-project delta.  Reports both the average
    delta and the cumulative total.

    Args:
        db: Database connection.
        weeks: Look-back window in weeks.
        target_level: Simulated knowledge level (0–5).

    Returns:
        List of delta data dicts sorted by ``avg_delta`` DESC.
    """
    cutoff = datetime.datetime.now(UTC) - timedelta(weeks=weeks)

    # 1. Confirmed skills below target level (same subquery as ``chart_swing``)
    skills = await skill_repository.get_confirmed_skills_below_level(db, target_level)

    project_cache: dict[int, list[tuple[SkillRef, float | None, float | None, str | None]]] = {}

    async def _get_project_skills(project_id: int):
        """Return the active scored skills for a project, cached per call.

        Args:
            project_id: Project whose active skills are requested.

        Returns:
            The cached scored-skill rows for *project_id*.
        """
        if project_id not in project_cache:
            project_cache[project_id] = await skill_repository.get_scored_skills(
                db,
                project_id,
                status="active",
            )
        return project_cache[project_id]

    results: list[dict[str, Any]] = []

    for skill in skills:
        project_ids = await skill_repository.get_master_project_ids_for_skill_since(db, skill.id, cutoff)

        if not project_ids:
            continue

        count = len(project_ids)
        sum_before = 0.0
        sum_after = 0.0
        total_delta = 0.0

        for pid in project_ids:
            skills_data = await _get_project_skills(pid)
            current = _compute_match_score(skills_data)
            simulated = simulate_score(skills_data, skill.id, target_level)

            current_val = float(current) if current is not None else 0.0
            simulated_val = float(simulated) if simulated is not None else 0.0
            delta = simulated_val - current_val

            sum_before += current_val
            sum_after += simulated_val
            total_delta += delta

        results.append(
            {
                "skill_id": skill.id,
                "skill_name": skill.name,
                "current_level": skill.level,
                "project_count": count,
                "avg_score_before": round(sum_before / count, 1),
                "avg_score_after": round(sum_after / count, 1),
                "avg_delta": round(total_delta / count, 1),
                "total_delta": round(total_delta, 1),
            }
        )

    results.sort(key=lambda r: r["avg_delta"], reverse=True)
    return results


async def chart_monthly_projects(
    db: AsyncSession,
    threshold: float = 75.0,
) -> list[dict[str, Any]]:
    """Monthly project volume: total vs. matching (>= threshold).

    Shows all data from the beginning, grouped by calendar month.
    Returns list of dicts sorted by month ASC:
        [{"month": "2026-01", "total": 100, "matching": 30}, ...]
    """
    rows = await project_repository.get_monthly_project_counts(db, threshold)
    return [
        {
            "month": row.month,
            "total": row.total,
            "matching": row.matching,
        }
        for row in rows
    ]
