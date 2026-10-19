"""Unit tests for the AIScope chart/analysis service (repository doubles, no DB).

The chart computations read through ``skill_repository``/``project_repository``;
those system boundaries are doubled so the pure ranking/aggregation behaviour is
exercised deterministically without a database.
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.fbf.repositories.skill_repository import SkillRef
from app.fbf.services import project_chart_service as svc

pytestmark = pytest.mark.unit


class _DB:
    """Minimal async-session stand-in (only passed through to the doubles)."""


def _ref(
    sid: int,
    *,
    name: str = "Skill",
    level: int | None = None,
    importance: int | None = None,
    level_public: int | None = None,
) -> SkillRef:
    """Build a minimal ``SkillRef`` DTO."""
    return SkillRef(
        id=sid,
        name=name,
        description=None,
        importance=importance,
        level=level,
        level_public=level_public,
        canonical_id=None,
        group_id=None,
        sort=None,
        vector=None,
    )


def test_trend_windows_whitelists_the_supported_units() -> None:
    assert frozenset({"day", "week", "month", "quarter", "year"}) == svc.TREND_WINDOWS


# ── radar / bar ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_chart_radar_projects_ranked_skills_and_forwards_filters(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, object] = {}

    async def _ranked(_db: object, *, top_n: int, role_id: int | None) -> list[SkillRef]:
        seen.update(top_n=top_n, role_id=role_id)
        return [_ref(1, name="Python", level=3, importance=5)]

    monkeypatch.setattr(svc.skill_repository, "get_ranked_skills", _ranked)

    out = await svc.chart_radar(_DB(), role_id=2, top_n=5)

    assert seen == {"top_n": 5, "role_id": 2}
    assert [(p.skill_id, p.skill_name, p.importance, p.level) for p in out] == [(1, "Python", 5, 3)]


@pytest.mark.asyncio
async def test_chart_bar_projects_ranked_skills(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _ranked(_db: object, *, top_n: int, role_id: int | None) -> list[SkillRef]:
        return [_ref(2, name="Docker", importance=4)]

    monkeypatch.setattr(svc.skill_repository, "get_ranked_skills", _ranked)

    out = await svc.chart_bar(_DB(), top_n=20)

    assert [(p.skill_id, p.skill_name, p.importance) for p in out] == [(2, "Docker", 4)]


# ── trend ────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_chart_trend_empty_skill_ids_returns_empty() -> None:
    assert await svc.chart_trend(_DB(), []) == []


@pytest.mark.asyncio
async def test_chart_trend_falls_back_to_default_window(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, object] = {}

    async def _points(_db: object, *, skill_ids: list[int], window: str, role_id: int | None) -> list[object]:
        seen["window"] = window
        return []

    monkeypatch.setattr(svc.skill_repository, "get_trend_points", _points)

    await svc.chart_trend(_DB(), [1], window="bogus")

    assert seen["window"] == "month"


@pytest.mark.asyncio
async def test_chart_trend_passes_valid_window_and_ids_through(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, object] = {}

    async def _points(_db: object, *, skill_ids: list[int], window: str, role_id: int | None) -> list[object]:
        seen.update(window=window, ids=skill_ids)
        return []

    monkeypatch.setattr(svc.skill_repository, "get_trend_points", _points)

    await svc.chart_trend(_DB(), [1, 2], window="week")

    assert seen == {"window": "week", "ids": [1, 2]}


# ── impact ───────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_chart_impact_ranks_skills_and_counts_match_swings(monkeypatch: pytest.MonkeyPatch) -> None:
    skill = _ref(1, name="A", level=2, importance=4)
    scored = [(_ref(1, level=1, importance=4), 4.0, 4.0, "active")]

    async def _counts(_db: object, **_kw: object) -> list[tuple[SkillRef, int, float, str, str]]:
        return [(skill, 5, 4.0, "active", "green")]

    async def _scores(_db: object, _cutoff: object) -> dict[int, float]:
        return {10: 80.0}

    async def _pairs(_db: object, _cutoff: object) -> list[tuple[int, int]]:
        return [(10, 1)]

    async def _scored(_db: object, _pid: int, *, status: str) -> list[object]:
        return scored

    monkeypatch.setattr(svc.skill_repository, "get_paginated_with_counts", _counts)
    monkeypatch.setattr(svc.skill_repository, "get_master_skill_project_pairs_since", _pairs)
    monkeypatch.setattr(svc.skill_repository, "get_scored_skills", _scored)
    monkeypatch.setattr(svc.project_repository, "get_master_confirmed_scores_since", _scores)

    out = await svc.chart_impact(_DB(), threshold=75.0, target_level=4)

    assert len(out) == 1
    point = out[0]
    assert (point.skill_id, point.project_count) == (1, 1)
    assert point.impact == 12.0  # blended 4 × 1 project × gap max(5−2,1)=3
    assert (point.current_match, point.simulated_match, point.match_delta) == (1, 2, 1)


@pytest.mark.asyncio
async def test_chart_impact_skips_skills_without_recent_projects(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _counts(_db: object, **_kw: object) -> list[tuple[SkillRef, int, float, str, str]]:
        return [(_ref(1, name="A", level=2, importance=4), 5, 4.0, "active", "green")]

    async def _scores(_db: object, _cutoff: object) -> dict[int, float]:
        return {}

    async def _pairs(_db: object, _cutoff: object) -> list[tuple[int, int]]:
        return []

    monkeypatch.setattr(svc.skill_repository, "get_paginated_with_counts", _counts)
    monkeypatch.setattr(svc.skill_repository, "get_master_skill_project_pairs_since", _pairs)
    monkeypatch.setattr(svc.project_repository, "get_master_confirmed_scores_since", _scores)

    assert await svc.chart_impact(_DB()) == []


# ── swing / delta ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_chart_swing_counts_only_projects_crossing_the_threshold(monkeypatch: pytest.MonkeyPatch) -> None:
    skill = _ref(1, name="A", level=2, importance=4)
    data = {
        10: [(_ref(1, level=2, importance=4), 4.0, 4.0, "active")],  # cur 40 == threshold
        11: [(_ref(1, level=1, importance=4), 4.0, 4.0, "active")],  # cur 20 → swings
    }

    async def _below(_db: object, _target: int) -> list[SkillRef]:
        return [skill]

    async def _ids(_db: object, _sid: int, _cutoff: object) -> list[int]:
        return [10, 11]

    async def _scored(_db: object, pid: int, *, status: str) -> list[object]:
        return data[pid]

    monkeypatch.setattr(svc.skill_repository, "get_confirmed_skills_below_level", _below)
    monkeypatch.setattr(svc.skill_repository, "get_master_project_ids_for_skill_since", _ids)
    monkeypatch.setattr(svc.skill_repository, "get_scored_skills", _scored)

    out = await svc.chart_swing(_DB(), threshold=40, target_level=4)

    assert out[0]["swing_count"] == 1  # "40 < 40" is False → only project 11 swings
    assert out[0]["total_projects"] == 2
    assert out[0]["current_avg_score"] == 30.0  # (40 + 20) / 2


@pytest.mark.asyncio
async def test_chart_delta_reports_average_improvement(monkeypatch: pytest.MonkeyPatch) -> None:
    skill = _ref(1, name="A", level=2, importance=4)
    data = {
        10: [(_ref(1, level=2, importance=4), 4.0, 4.0, "active")],  # cur 40
        11: [(_ref(1, level=1, importance=4), 4.0, 4.0, "active")],  # cur 20
    }

    async def _below(_db: object, _target: int) -> list[SkillRef]:
        return [skill]

    async def _ids(_db: object, _sid: int, _cutoff: object) -> list[int]:
        return [10, 11]

    async def _scored(_db: object, pid: int, *, status: str) -> list[object]:
        return data[pid]

    monkeypatch.setattr(svc.skill_repository, "get_confirmed_skills_below_level", _below)
    monkeypatch.setattr(svc.skill_repository, "get_master_project_ids_for_skill_since", _ids)
    monkeypatch.setattr(svc.skill_repository, "get_scored_skills", _scored)

    out = await svc.chart_delta(_DB(), target_level=4)

    assert (out[0]["avg_score_before"], out[0]["avg_score_after"]) == (30.0, 80.0)
    assert (out[0]["avg_delta"], out[0]["total_delta"]) == (50.0, 100.0)


# ── monthly volume ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_chart_monthly_projects_maps_rows(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _rows(_db: object, _threshold: float) -> list[SimpleNamespace]:
        return [SimpleNamespace(month="2026-01", total=100, matching=30)]

    monkeypatch.setattr(svc.project_repository, "get_monthly_project_counts", _rows)

    assert await svc.chart_monthly_projects(_DB(), threshold=75.0) == [
        {"month": "2026-01", "total": 100, "matching": 30}
    ]
