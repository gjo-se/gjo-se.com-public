"""Unit tests for the pure parts of the project service.

The weighted match-score formula and the read-model projection are DB-free;
they are exercised here with in-memory ORM objects. DB-backed functions of the
same module are covered on the integration level.
"""

from __future__ import annotations

from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.fbf.models.project import Project
from app.fbf.models.skill import Skill
from app.fbf.repositories.project_repository import ProjectRow
from app.fbf.repositories.skill_repository import SkillRef
from app.fbf.services import project_service as svc
from app.fbf.services.project_service import (
    _compute_match_score,
    _compute_trend_all,
    public_score_from_skills,
    row_to_project_out,
)

pytestmark = pytest.mark.unit

#: A scored-skill tuple as returned by ``get_scored_skills``.
ScoredSkill = tuple[Skill, float | None, float | None, str | None]


def _scored(
    *,
    importance: int | None,
    project_importance: float | None,
    avg_importance: float | None,
    level: int | None,
    level_public: int | None,
    status: str | None,
) -> ScoredSkill:
    """Build one scored-skill tuple with deterministic values."""
    skill = Skill(name="Skill", importance=importance, level=level, level_public=level_public)
    return (skill, project_importance, avg_importance, status)


# ── _compute_match_score ─────────────────────────────────────────────────────


def test_compute_match_score_blends_sources_and_scales_to_percent() -> None:
    """Equal-weight blend of 4/4/4 with level 3 yields 60 %."""
    scored = [
        _scored(importance=4, project_importance=4.0, avg_importance=4.0, level=3, level_public=3, status="active")
    ]

    assert _compute_match_score(scored) == Decimal("60")


def test_compute_match_score_uses_public_level_when_requested() -> None:
    """``use_public_level`` substitutes ``level_public`` for the internal level."""
    scored = [
        _scored(importance=4, project_importance=4.0, avg_importance=4.0, level=3, level_public=5, status="active")
    ]

    assert _compute_match_score(scored, use_public_level=True) == Decimal("100")


def test_compute_match_score_returns_none_without_any_weight() -> None:
    """When all three importance sources are NULL there is no basis for a score."""
    scored = [
        _scored(importance=None, project_importance=None, avg_importance=None, level=5, level_public=5, status="active")
    ]

    assert _compute_match_score(scored) is None


def test_compute_match_score_treats_missing_level_as_zero() -> None:
    """A skill without a curated level drags the score down instead of being ignored."""
    scored = [
        _scored(
            importance=4, project_importance=4.0, avg_importance=4.0, level=None, level_public=None, status="active"
        )
    ]

    assert _compute_match_score(scored) == Decimal("0")


# ── public_score_from_skills ─────────────────────────────────────────────────


def test_public_score_from_skills_ignores_inactive_skills() -> None:
    """Only ``status == 'active'`` skills contribute to the public score."""
    active = _scored(importance=4, project_importance=4.0, avg_importance=4.0, level=3, level_public=4, status="active")
    pending = _scored(
        importance=5, project_importance=5.0, avg_importance=5.0, level=5, level_public=5, status="pending"
    )

    assert public_score_from_skills([active, pending]) == Decimal("80")


def test_public_score_from_skills_returns_none_without_active_skills() -> None:
    """No active skill yields ``None``."""
    pending = _scored(
        importance=5, project_importance=5.0, avg_importance=5.0, level=5, level_public=5, status="pending"
    )

    assert public_score_from_skills([pending]) is None


# ── row_to_project_out ───────────────────────────────────────────────────────


def test_row_to_project_out_copies_view_fields_from_read_model() -> None:
    """The read-model view fields are projected onto the API DTO."""
    project = Project(
        url="https://example.test/p",
        title="Project",
        description=None,
        city=None,
        country=None,
        remote_percent=None,
        contract_type=None,
        duration=None,
        start_date=None,
        posted_at=None,
        scraped_at=None,
    )
    project.id = 7
    row = ProjectRow(
        project=project,
        status="active",
        status_color_token="green",
        freelancermap_id=42,
        slave_count=3,
    )

    out = row_to_project_out(row)

    assert out.id == 7
    assert out.slave_count == 3
    assert out.status == "active"
    assert out.status_color_token == "green"
    assert out.freelancermap_id == 42


# ── analytics: simulate_score + chart_* (repository doubles) ─────────────────


def _ref(
    sid: int,
    *,
    name: str = "Skill",
    level: int | None = None,
    importance: int | None = None,
    level_public: int | None = None,
) -> SkillRef:
    """Build a minimal ``SkillRef`` for the analytics functions."""
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


def _patch_repo(monkeypatch: pytest.MonkeyPatch, **fns: object) -> None:
    for name, fn in fns.items():
        monkeypatch.setattr(svc.skill_repository, name, fn)


class _DB:
    """Minimal async-session stand-in (module only passes it through)."""


def test_simulate_score_overrides_only_the_target_skill_level() -> None:
    """The simulated score raises only the overridden skill; originals stay intact."""
    target = _ref(1, level=1, importance=4)
    other = _ref(2, level=4, importance=4)
    scored = [
        (target, 4.0, 4.0, "active"),
        (other, 4.0, 4.0, "active"),
    ]

    assert svc.simulate_score(scored, 1, 4) == Decimal("80")
    assert target.level == 1  # ORM object never mutated


def test_simulate_score_is_noop_for_unknown_skill() -> None:
    """Overriding an id that is absent keeps every level unchanged."""
    scored = [(_ref(1, level=3, importance=4), 4.0, 4.0, "active")]
    assert svc.simulate_score(scored, 99, 5) == _compute_match_score(scored)


@pytest.mark.asyncio
async def test_chart_trend_empty_skill_ids_returns_empty() -> None:
    assert await svc.chart_trend(_DB(), []) == []


@pytest.mark.asyncio
async def test_chart_trend_falls_back_to_default_window(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, object] = {}

    async def _points(_db: object, *, skill_ids: list[int], window: str, role_id: int | None) -> list[object]:
        seen["window"] = window
        return []

    _patch_repo(monkeypatch, get_trend_points=_points)
    await svc.chart_trend(_DB(), [1], window="bogus")
    assert seen["window"] == "month"


@pytest.mark.asyncio
async def test_chart_trend_passes_valid_window_through(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, object] = {}

    async def _points(_db: object, *, skill_ids: list[int], window: str, role_id: int | None) -> list[object]:
        seen["window"] = window
        return []

    _patch_repo(monkeypatch, get_trend_points=_points)
    await svc.chart_trend(_DB(), [1], window="week")
    assert seen["window"] == "week"


@pytest.mark.asyncio
async def test_chart_impact_ranks_skills_and_counts_swings(monkeypatch: pytest.MonkeyPatch) -> None:
    skill_a = _ref(1, name="A", level=2, importance=4)
    # A project scored-skill at level 1 → current 20 %, simulated to level 4 → 80 %.
    scored = [(_ref(1, level=1, importance=4), 4.0, 4.0, "active")]

    async def _counts(_db: object, **_kw: object) -> list[tuple[SkillRef, int, float, str, str]]:
        return [(skill_a, 5, 4.0, "active", "green")]

    async def _scores(_db: object, _cutoff: object) -> dict[int, float]:
        return {10: 80.0}

    async def _pairs(_db: object, _cutoff: object) -> list[tuple[int, int]]:
        return [(10, 1)]

    async def _scored(_db: object, _pid: int, *, status: str) -> list[tuple[SkillRef, float, float, str]]:
        return scored

    async def _proj_scores(*_a: object, **_k: object) -> list[object]:
        return []

    _patch_repo(
        monkeypatch,
        get_paginated_with_counts=_counts,
        get_master_skill_project_pairs_since=_pairs,
        get_scored_skills=_scored,
    )
    monkeypatch.setattr(svc.project_repository, "get_master_confirmed_scores_since", _scores)
    monkeypatch.setattr(svc.project_repository, "get_monthly_project_counts", _proj_scores)

    out = await svc.chart_impact(_DB(), threshold=75.0, target_level=4)
    assert len(out) == 1
    point = out[0]
    assert point.skill_id == 1
    assert point.project_count == 1
    assert point.impact == 12.0  # blended 4 × 1 project × gap max(5−2,1)=3
    assert point.current_match == 1
    assert point.simulated_match == 2
    assert point.match_delta == 1


@pytest.mark.asyncio
async def test_chart_impact_skips_skills_without_recent_projects(monkeypatch: pytest.MonkeyPatch) -> None:
    skill = _ref(1, name="A", level=2, importance=4)

    async def _counts(_db: object, **_kw: object) -> list[tuple[SkillRef, int, float, str, str]]:
        return [(skill, 5, 4.0, "active", "green")]

    async def _scores(_db: object, _cutoff: object) -> dict[int, float]:
        return {}

    async def _pairs(_db: object, _cutoff: object) -> list[tuple[int, int]]:
        return []  # no links → week_count 0

    _patch_repo(monkeypatch, get_paginated_with_counts=_counts, get_master_skill_project_pairs_since=_pairs)
    monkeypatch.setattr(svc.project_repository, "get_master_confirmed_scores_since", _scores)

    assert await svc.chart_impact(_DB()) == []


@pytest.mark.asyncio
async def test_chart_impact_skips_simulation_at_or_above_target(monkeypatch: pytest.MonkeyPatch) -> None:
    skill = _ref(1, name="A", level=4, importance=4)  # level == target → no simulation

    async def _counts(_db: object, **_kw: object) -> list[tuple[SkillRef, int, float, str, str]]:
        return [(skill, 5, 4.0, "active", "green")]

    async def _scores(_db: object, _cutoff: object) -> dict[int, float]:
        return {10: 80.0}

    async def _pairs(_db: object, _cutoff: object) -> list[tuple[int, int]]:
        return [(10, 1)]

    async def _scored(_db: object, _pid: int, *, status: str) -> list[object]:
        raise AssertionError("scored skills must not be loaded when level >= target")

    _patch_repo(
        monkeypatch,
        get_paginated_with_counts=_counts,
        get_master_skill_project_pairs_since=_pairs,
        get_scored_skills=_scored,
    )
    monkeypatch.setattr(svc.project_repository, "get_master_confirmed_scores_since", _scores)

    out = await svc.chart_impact(_DB(), threshold=75.0, target_level=4)
    assert out[0].simulated_match == out[0].current_match
    assert out[0].match_delta == 0


@pytest.mark.asyncio
async def test_chart_impact_treats_project_at_threshold_as_not_below(monkeypatch: pytest.MonkeyPatch) -> None:
    skill = _ref(1, name="A", level=2, importance=4)
    scored = [(_ref(1, level=2, importance=4), 4.0, 4.0, "active")]  # current 40 %

    async def _counts(_db: object, **_kw: object) -> list[tuple[SkillRef, int, float, str, str]]:
        return [(skill, 5, 4.0, "active", "green")]

    async def _scores(_db: object, _cutoff: object) -> dict[int, float]:
        return {10: 40.0}  # == threshold → counts as matching global

    async def _pairs(_db: object, _cutoff: object) -> list[tuple[int, int]]:
        return [(10, 1)]

    async def _scored(_db: object, _pid: int, *, status: str) -> list[object]:
        return scored

    _patch_repo(
        monkeypatch,
        get_paginated_with_counts=_counts,
        get_master_skill_project_pairs_since=_pairs,
        get_scored_skills=_scored,
    )
    monkeypatch.setattr(svc.project_repository, "get_master_confirmed_scores_since", _scores)

    out = await svc.chart_impact(_DB(), threshold=40.0, target_level=4)
    # current == threshold ⇒ not "below" ⇒ neither swing nor delta
    assert out[0].current_match == 1
    assert out[0].simulated_match == 1
    assert out[0].match_delta == 0


@pytest.mark.asyncio
async def test_chart_swing_boundary_and_average_over_two_projects(monkeypatch: pytest.MonkeyPatch) -> None:
    skill = _ref(1, name="A", level=2, importance=4)
    data = {
        10: [(_ref(1, level=2, importance=4), 4.0, 4.0, "active")],  # cur 40 == threshold
        11: [(_ref(1, level=1, importance=4), 4.0, 4.0, "active")],  # cur 20 → swings
    }

    async def _below(_db: object, _target: int) -> list[SkillRef]:
        return [skill]

    async def _project_ids(_db: object, _sid: int, _cutoff: object) -> list[int]:
        return [10, 11]

    async def _scored(_db: object, pid: int, *, status: str) -> list[object]:
        return data[pid]

    _patch_repo(
        monkeypatch,
        get_confirmed_skills_below_level=_below,
        get_master_project_ids_for_skill_since=_project_ids,
        get_scored_skills=_scored,
    )

    out = await svc.chart_swing(_DB(), threshold=40, target_level=4)
    assert out[0]["swing_count"] == 1  # 40 < 40 is False → only project 11 swings
    assert out[0]["total_projects"] == 2
    assert out[0]["current_avg_score"] == 30.0  # (40 + 20) / 2


@pytest.mark.asyncio
async def test_chart_delta_averages_over_two_projects(monkeypatch: pytest.MonkeyPatch) -> None:
    skill = _ref(1, name="A", level=2, importance=4)
    data = {
        10: [(_ref(1, level=2, importance=4), 4.0, 4.0, "active")],  # cur 40
        11: [(_ref(1, level=1, importance=4), 4.0, 4.0, "active")],  # cur 20
    }

    async def _below(_db: object, _target: int) -> list[SkillRef]:
        return [skill]

    async def _project_ids(_db: object, _sid: int, _cutoff: object) -> list[int]:
        return [10, 11]

    async def _scored(_db: object, pid: int, *, status: str) -> list[object]:
        return data[pid]

    _patch_repo(
        monkeypatch,
        get_confirmed_skills_below_level=_below,
        get_master_project_ids_for_skill_since=_project_ids,
        get_scored_skills=_scored,
    )

    out = await svc.chart_delta(_DB(), target_level=4)
    assert out[0]["avg_score_before"] == 30.0  # (40 + 20) / 2
    assert out[0]["avg_score_after"] == 80.0
    assert out[0]["avg_delta"] == 50.0  # (40 + 60) / 2
    assert out[0]["total_delta"] == 100.0  # 40 (40→80) + 60 (20→80)


@pytest.mark.asyncio
async def test_chart_swing_counts_swings_and_average(monkeypatch: pytest.MonkeyPatch) -> None:
    skill = _ref(1, name="A", level=1, importance=4)
    scored = [(_ref(1, level=1, importance=4), 4.0, 4.0, "active")]

    async def _below(_db: object, _target: int) -> list[SkillRef]:
        return [skill]

    async def _project_ids(_db: object, _sid: int, _cutoff: object) -> list[int]:
        return [10]

    async def _scored(_db: object, _pid: int, *, status: str) -> list[object]:
        return scored

    _patch_repo(
        monkeypatch,
        get_confirmed_skills_below_level=_below,
        get_master_project_ids_for_skill_since=_project_ids,
        get_scored_skills=_scored,
    )

    out = await svc.chart_swing(_DB(), threshold=75, target_level=4)
    assert out == [
        {
            "skill_id": 1,
            "skill_name": "A",
            "current_level": 1,
            "current_avg_score": 20.0,
            "total_projects": 1,
            "swing_count": 1,
        }
    ]


@pytest.mark.asyncio
async def test_chart_swing_skips_skills_without_projects(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _below(_db: object, _target: int) -> list[SkillRef]:
        return [_ref(1, level=1, importance=4)]

    async def _project_ids(_db: object, _sid: int, _cutoff: object) -> list[int]:
        return []

    _patch_repo(
        monkeypatch, get_confirmed_skills_below_level=_below, get_master_project_ids_for_skill_since=_project_ids
    )

    assert await svc.chart_swing(_DB()) == []


@pytest.mark.asyncio
async def test_chart_delta_reports_average_delta(monkeypatch: pytest.MonkeyPatch) -> None:
    skill = _ref(1, name="A", level=1, importance=4)
    scored = [(_ref(1, level=1, importance=4), 4.0, 4.0, "active")]

    async def _below(_db: object, _target: int) -> list[SkillRef]:
        return [skill]

    async def _project_ids(_db: object, _sid: int, _cutoff: object) -> list[int]:
        return [10]

    async def _scored(_db: object, _pid: int, *, status: str) -> list[object]:
        return scored

    _patch_repo(
        monkeypatch,
        get_confirmed_skills_below_level=_below,
        get_master_project_ids_for_skill_since=_project_ids,
        get_scored_skills=_scored,
    )

    out = await svc.chart_delta(_DB(), target_level=4)
    assert out[0]["avg_score_before"] == 20.0
    assert out[0]["avg_score_after"] == 80.0
    assert out[0]["avg_delta"] == 60.0
    assert out[0]["total_delta"] == 60.0
    assert out[0]["project_count"] == 1


@pytest.mark.asyncio
async def test_chart_monthly_projects_maps_rows(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _rows(_db: object, _threshold: float) -> list[SimpleNamespace]:
        return [SimpleNamespace(month="2026-01", total=100, matching=30)]

    monkeypatch.setattr(svc.project_repository, "get_monthly_project_counts", _rows)

    assert await svc.chart_monthly_projects(_DB(), threshold=75.0) == [
        {"month": "2026-01", "total": 100, "matching": 30}
    ]


@pytest.mark.asyncio
async def test_compute_trend_all_short_circuits_without_skills(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _ids(_db: object) -> list[int]:
        return []

    async def _trend(_db: object, **_kw: object) -> list[object]:
        raise AssertionError("chart_trend must not run without skill ids")

    _patch_repo(monkeypatch, get_active_skill_ids=_ids)
    monkeypatch.setattr(svc, "chart_trend", _trend)

    assert await _compute_trend_all(_DB()) == []


@pytest.mark.asyncio
async def test_compute_trend_all_delegates_with_month_window(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, object] = {}

    async def _ids(_db: object) -> list[int]:
        return [1, 2]

    async def _trend(_db: object, *, skill_ids: list[int], window: str) -> list[str]:
        seen["ids"] = skill_ids
        seen["window"] = window
        return ["point"]

    _patch_repo(monkeypatch, get_active_skill_ids=_ids)
    monkeypatch.setattr(svc, "chart_trend", _trend)

    assert await _compute_trend_all(_DB()) == ["point"]
    assert seen == {"ids": [1, 2], "window": "month"}


@pytest.mark.asyncio
async def test_compute_analysis_cache_assembles_and_writes(monkeypatch: pytest.MonkeyPatch) -> None:
    written: list[dict[str, object]] = []

    async def _empty(*_a: object, **_k: object) -> list[object]:
        return []

    async def _no_ids(_db: object) -> list[int]:
        return []

    monkeypatch.setattr(svc, "chart_impact", _empty)
    monkeypatch.setattr(svc, "chart_swing", _empty)
    monkeypatch.setattr(svc, "chart_delta", _empty)
    _patch_repo(monkeypatch, get_active_skill_ids=_no_ids)
    monkeypatch.setattr(svc, "chart_monthly_projects", _empty)
    monkeypatch.setattr(svc, "write_cache", written.append)

    cache = await svc.compute_analysis_cache(_DB(), weeks=8, threshold=70.0, target_level=3)

    assert written == [cache]
    assert cache["weeks"] == 8
    assert cache["threshold"] == 70.0
    assert cache["target_level"] == 3
    assert cache["impact"] == []
    assert set(cache) >= {"computed_at", "impact", "swing", "delta", "trend", "monthly"}
