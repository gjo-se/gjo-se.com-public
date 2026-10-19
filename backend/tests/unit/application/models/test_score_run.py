"""Unit tests for the ScoreRun ORM model metadata."""

from __future__ import annotations

import pytest

from app.application.models.score_run import ScoreRun
from tests.unit.application.models._contract import foreign_key_for_column

pytestmark = pytest.mark.unit


def test_score_run_maps_to_expected_table() -> None:
    """The model is bound to ``application_score_run``."""
    assert ScoreRun.__tablename__ == "application_score_run"


def test_score_run_has_no_status_column() -> None:
    """The append-only run carries completion via ``completed_at``, no status."""
    assert "status" not in ScoreRun.__table__.c


def test_score_run_cascades_with_its_submission() -> None:
    """Deleting the submission removes its score runs."""
    target, ondelete = foreign_key_for_column(ScoreRun, "application_submission_id")

    assert target == "application_submission.id"
    assert ondelete == "CASCADE"


def test_score_run_cascades_with_its_project() -> None:
    """Deleting the project removes its score runs."""
    target, ondelete = foreign_key_for_column(ScoreRun, "project_id")

    assert target == "fbf_project.id"
    assert ondelete == "CASCADE"


def test_score_run_llm_call_log_reference_has_no_foreign_key() -> None:
    """The cross-schema LLM call-log reference is a plain column (no FK)."""
    assert "llm_call_log_id" in ScoreRun.__table__.c
    assert all(fk.parent.name != "llm_call_log_id" for fk in ScoreRun.__table__.foreign_keys)
