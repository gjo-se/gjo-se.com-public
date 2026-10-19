"""Unit tests for the project match-score service (repository doubles, no DB).

The weighted coverage formula, the level-override simulation and the two
recalculation entry points are exercised with in-memory skill tuples; the
repositories are doubled at the system boundary.
"""

from __future__ import annotations

from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.fbf.repositories.skill_repository import SkillRef
from app.fbf.services import project_score_service as svc
from app.fbf.services.project_score_service import _compute_match_score

pytestmark = pytest.mark.unit


class _FakeDB:
    """Session double that counts commits (recalculation persists + commits)."""

    def __init__(self) -> None:
        self.commits = 0

    async def commit(self) -> None:
        self.commits += 1


def _ref(
    sid: int,
    *,
    name: str = "Skill",
    importance: int | None = None,
    level: int | None = None,
    level_public: int | None = None,
) -> SkillRef:
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


def _scored(
    *,
    importance: int | None,
    project_importance: float | None,
    avg_importance: float | None,
    level: int | None,
    level_public: int | None,
    status: str | None,
    sid: int = 1,
) -> tuple[SkillRef, float | None, float | None, str | None]:
    skill = _ref(sid, importance=importance, level=level, level_public=level_public)
    return (skill, project_importance, avg_importance, status)


# ── _compute_match_score ─────────────────────────────────────────────────────


def test_compute_match_score_blends_three_sources_and_scales_to_percent() -> None:
    scored = [
        _scored(importance=4, project_importance=4.0, avg_importance=4.0, level=3, level_public=3, status="active")
    ]

    assert _compute_match_score(scored) == Decimal("60")


def test_compute_match_score_uses_public_level_when_requested() -> None:
    scored = [
        _scored(importance=4, project_importance=4.0, avg_importance=4.0, level=3, level_public=5, status="active")
    ]

    assert _compute_match_score(scored, use_public_level=True) == Decimal("100")


def test_compute_match_score_returns_none_without_any_weight() -> None:
    scored = [
        _scored(importance=None, project_importance=None, avg_importance=None, level=5, level_public=5, status="active")
    ]

    assert _compute_match_score(scored) is None


def test_compute_match_score_treats_missing_level_as_zero() -> None:
    scored = [
        _scored(
            importance=4, project_importance=4.0, avg_importance=4.0, level=None, level_public=None, status="active"
        )
    ]

    assert _compute_match_score(scored) == Decimal("0")


# ── public_score_from_skills ─────────────────────────────────────────────────


def test_public_score_from_skills_ignores_inactive_skills() -> None:
    active = _scored(importance=4, project_importance=4.0, avg_importance=4.0, level=3, level_public=4, status="active")
    pending = _scored(
        importance=5, project_importance=5.0, avg_importance=5.0, level=5, level_public=5, status="pending", sid=2
    )

    assert svc.public_score_from_skills([active, pending]) == Decimal("80")


def test_public_score_from_skills_returns_none_without_active_skills() -> None:
    pending = _scored(
        importance=5, project_importance=5.0, avg_importance=5.0, level=5, level_public=5, status="pending"
    )

    assert svc.public_score_from_skills([pending]) is None


# ── simulate_score ───────────────────────────────────────────────────────────


def test_simulate_score_overrides_only_the_target_skill_level() -> None:
    target = _ref(1, level=1, importance=4)
    other = _ref(2, level=4, importance=4)
    scored = [(target, 4.0, 4.0, "active"), (other, 4.0, 4.0, "active")]

    assert svc.simulate_score(scored, 1, 4) == Decimal("80")
    assert target.level == 1  # the source skill is never mutated


def test_simulate_score_is_a_noop_for_an_unknown_skill() -> None:
    scored = [(_ref(1, level=3, importance=4), 4.0, 4.0, "active")]

    assert svc.simulate_score(scored, 99, 5) == _compute_match_score(scored)


# ── compute_public_score ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_compute_public_score_uses_active_level_public(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _scored(_db: object, _pid: int, *, status: str) -> list[tuple[SkillRef, float, float, str]]:
        assert status == "active"
        return [(_ref(1, importance=4, level=3, level_public=5), 4.0, 4.0, "active")]

    monkeypatch.setattr(svc.skill_repository, "get_scored_skills", _scored)

    assert await svc.compute_public_score(_FakeDB(), 7) == 100.0


# ── recalculate_match_score ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_recalculate_match_score_all_none_when_project_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _none(_db: object, _pid: int) -> None:
        return None

    monkeypatch.setattr(svc.project_repository, "get_out_by_id", _none)

    result = await svc.recalculate_match_score(_FakeDB(), 5)

    assert result == {"project_id": 5, "match_score": None, "confirmed_score": None, "public_score": None}


@pytest.mark.asyncio
async def test_recalculate_match_score_persists_and_commits(monkeypatch: pytest.MonkeyPatch) -> None:
    saved: dict[str, float | int] = {}
    all_skills = [(_ref(1, importance=4, level=3, level_public=3), 4.0, 4.0, "active")]

    async def _get_out(_db: object, pid: int) -> SimpleNamespace:
        return SimpleNamespace(id=pid)

    async def _scored(_db: object, _pid: int, status: str | None = None) -> list[object]:
        return all_skills

    async def _set_scores(_db: object, pid: int, *, match_score: object, confirmed_score: object) -> None:
        saved.update(pid=pid, match=float(match_score), confirmed=float(confirmed_score))

    monkeypatch.setattr(svc.project_repository, "get_out_by_id", _get_out)
    monkeypatch.setattr(svc.skill_repository, "get_scored_skills", _scored)
    monkeypatch.setattr(svc.project_repository, "set_scores", _set_scores)

    db = _FakeDB()
    result = await svc.recalculate_match_score(db, 7)

    assert result == {"project_id": 7, "match_score": 60.0, "confirmed_score": 60.0, "public_score": 60.0}
    assert saved == {"pid": 7, "match": 60.0, "confirmed": 60.0}
    assert db.commits == 1


@pytest.mark.asyncio
async def test_recalculate_all_scores_counts_only_scored_projects(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _ids(_db: object) -> list[int]:
        return [1, 2, 3]

    async def _recalc(_db: object, pid: int) -> dict[str, object]:
        return {"match_score": None if pid == 2 else 50.0}

    monkeypatch.setattr(svc.project_repository, "get_all_ids", _ids)
    monkeypatch.setattr(svc, "recalculate_match_score", _recalc)

    assert await svc.recalculate_all_scores(_FakeDB()) == {"updated": 2, "total": 3}
