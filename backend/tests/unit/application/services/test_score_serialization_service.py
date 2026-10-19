"""Unit tests for the read/serialize path of a persisted application score run.

``serialize_score_run`` builds the API schema (criteria, per-group aggregates,
coverage) from a persisted run and reconciles the stored coverage snapshot
against the current CV. The criterion read and the CV-skill read are replaced by
deterministic doubles, so no database is touched.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from app.application.domain.application_score_rubric_rules import (
    GROUP_FORM,
    GROUP_INHALT,
    GROUP_RAHMEN,
)
from app.application.schemas.score_schemas import (
    RequirementOut,
    ScoreCriterionOut,
    ScoreGroupOut,
    ScoreRunOut,
)
from app.application.services import score_serialization_service

pytestmark = pytest.mark.unit

_NOW = datetime(2026, 1, 1, tzinfo=UTC)


class _FakeCriterionRepository:
    """Criterion-repository double returning a fixed row list."""

    def __init__(self, rows: list[ScoreCriterionOut]) -> None:
        """Store the criterion rows the read returns."""
        self._rows = rows

    async def list_by_run(self, db: object, score_run_id: int) -> list[ScoreCriterionOut]:
        """Return the configured criterion rows."""
        return list(self._rows)


class _FakeCvService:
    """CV-service double returning a fixed grouped skill list."""

    def __init__(self, groups: list[dict[str, object]]) -> None:
        """Store the grouped CV skill list the load returns."""
        self._groups = groups

    async def _load_skill_groups(self, db: object, project_id: int, *, skills: object) -> list[dict[str, object]]:
        """Return the configured grouped CV skill list."""
        return self._groups


def _criterion(row_id: int, key: str, group: str, weight: int, value: float | None) -> ScoreCriterionOut:
    """Build a persisted criterion row DTO."""
    return ScoreCriterionOut(id=row_id, criterion_key=key, group_key=group, value=value, weight=weight)


def _run(*, requirements: list[RequirementOut], total_score: float | None) -> ScoreRunOut:
    """Build a persisted score-run DTO for serialization."""
    return ScoreRunOut(
        id=1,
        application_submission_id=2,
        project_id=3,
        weights_version="v1",
        total_score=total_score,
        verdict=None,
        created_at=_NOW,
        requirements=requirements,
    )


def _patch(monkeypatch: pytest.MonkeyPatch, rows: list[ScoreCriterionOut], groups: list[dict[str, object]]) -> None:
    """Replace the criterion read and the CV-skill read with deterministic doubles."""
    repo = _FakeCriterionRepository(rows)
    monkeypatch.setattr(score_serialization_service.score_criterion_repository, "list_by_run", repo.list_by_run)
    monkeypatch.setattr(score_serialization_service, "cv_service", _FakeCvService(groups))


async def test_serialize_score_run_aggregates_groups_and_reconciles_coverage(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Groups aggregate the persisted rows and the coverage snapshot follows the CV."""
    rows = [
        _criterion(1, "must_skills", GROUP_INHALT, 20, 0.5),
        _criterion(2, "semantic_fit", GROUP_INHALT, 12, None),
        _criterion(3, "proof_evidence", GROUP_FORM, 10, 1.0),
        _criterion(4, "ats_format", GROUP_FORM, 10, None),
        _criterion(5, "rate_match", GROUP_RAHMEN, 10, 1.0),
    ]
    requirements = [
        RequirementOut(text="Python-Erfahrung", kind="must"),
        RequirementOut(text="Kubernetes", kind="nice"),
        RequirementOut(text="COBOL", kind="must"),
    ]
    _patch(monkeypatch, rows, [{"label": "Languages", "skills": ["Python", "Kubernetes Basis"]}])

    out = await score_serialization_service.serialize_score_run(
        object(), _run(requirements=requirements, total_score=30.0), object()
    )

    assert [criterion.criterion_key for criterion in out.criteria] == [
        "must_skills",
        "semantic_fit",
        "proof_evidence",
        "ats_format",
        "rate_match",
    ]
    assert out.groups == [
        ScoreGroupOut(group=GROUP_INHALT, score=10.0, weight=32, assessed_weight=20),
        ScoreGroupOut(group=GROUP_FORM, score=10.0, weight=20, assessed_weight=10),
        ScoreGroupOut(group=GROUP_RAHMEN, score=10.0, weight=10, assessed_weight=10),
    ]
    assert out.assessed_weight == 40
    assert out.missing_keys == ["semantic_fit", "ats_format"]
    assert out.is_lower_bound is True
    assert out.normalized_score == 75.0
    assert out.is_conclusive is False


async def test_serialize_score_run_reconciles_requirements_against_the_cv(monkeypatch: pytest.MonkeyPatch) -> None:
    """Requirement coverage is re-derived case-insensitively from the current CV."""
    requirements = [
        RequirementOut(text="Python-Erfahrung", kind="must"),
        RequirementOut(text="Kubernetes", kind="nice"),
        RequirementOut(text="COBOL", kind="must"),
    ]
    _patch(monkeypatch, [], [{"label": "Languages", "skills": ["Python", "Kubernetes Basis"]}])

    out = await score_serialization_service.serialize_score_run(
        object(), _run(requirements=requirements, total_score=None), object()
    )

    assert out.requirements[0].covered is True
    assert out.requirements[0].cv_evidence == "Python"
    assert out.requirements[1].covered is True
    assert out.requirements[1].cv_evidence == "Kubernetes Basis"
    assert out.requirements[2].covered is False
    assert out.requirements[2].cv_evidence is None


async def test_serialize_score_run_full_coverage_is_conclusive_and_not_lower_bound(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A fully assessed run is conclusive and its total score is not a lower bound."""
    rows = [
        _criterion(1, "must_skills", GROUP_INHALT, 20, 1.0),
        _criterion(2, "semantic_fit", GROUP_INHALT, 12, 1.0),
        _criterion(3, "domain_fit", GROUP_INHALT, 7, 1.0),
        _criterion(4, "seniority_fit", GROUP_INHALT, 6, 1.0),
        _criterion(5, "proof_evidence", GROUP_FORM, 10, 1.0),
        _criterion(6, "ats_format", GROUP_FORM, 10, 1.0),
        _criterion(7, "rate_match", GROUP_RAHMEN, 10, 1.0),
        _criterion(8, "start_match", GROUP_RAHMEN, 8, 1.0),
        _criterion(9, "remote_match", GROUP_RAHMEN, 7, 1.0),
        _criterion(10, "language_match", GROUP_RAHMEN, 5, 1.0),
        _criterion(11, "contract_match", GROUP_RAHMEN, 5, 1.0),
    ]
    _patch(monkeypatch, rows, [])

    out = await score_serialization_service.serialize_score_run(
        object(), _run(requirements=[], total_score=100.0), object()
    )

    assert out.groups == [
        ScoreGroupOut(group=GROUP_INHALT, score=45.0, weight=45, assessed_weight=45),
        ScoreGroupOut(group=GROUP_FORM, score=20.0, weight=20, assessed_weight=20),
        ScoreGroupOut(group=GROUP_RAHMEN, score=35.0, weight=35, assessed_weight=35),
    ]
    assert out.assessed_weight == 100
    assert out.missing_keys == []
    assert out.is_lower_bound is False
    assert out.normalized_score == 100.0
    assert out.is_conclusive is True


async def test_serialize_score_run_without_total_score_leaves_normalized_none(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A run without a total score has no normalized score."""
    _patch(monkeypatch, [_criterion(1, "must_skills", GROUP_INHALT, 20, 1.0)], [])

    out = await score_serialization_service.serialize_score_run(
        object(), _run(requirements=[], total_score=None), object()
    )

    assert out.normalized_score is None
    assert out.assessed_weight == 20
    assert out.is_lower_bound is True
    assert out.is_conclusive is False
