"""Unit tests for the ScoreCriterion ORM model metadata."""

from __future__ import annotations

import pytest

from app.application.models.score_criterion import ScoreCriterion
from tests.unit.application.models._contract import (
    foreign_key_for_column,
    unique_constraint_columns,
)

pytestmark = pytest.mark.unit


def test_score_criterion_maps_to_expected_table() -> None:
    """The model is bound to ``application_score_criterion``."""
    assert ScoreCriterion.__tablename__ == "application_score_criterion"


def test_score_criterion_is_unique_per_run_and_key() -> None:
    """At most one row per ``(score_run_id, criterion_key)`` pair."""
    columns = unique_constraint_columns(ScoreCriterion, "uq_application_score_criterion_score_run_key")

    assert columns == {"score_run_id", "criterion_key"}


def test_score_criterion_weight_is_required_and_value_optional() -> None:
    """The weight snapshot is mandatory; the assessed value may be a gap."""
    table = ScoreCriterion.__table__

    assert table.c.weight.nullable is False
    assert table.c.value.nullable is True


def test_score_criterion_cascades_with_its_run() -> None:
    """Deleting the run removes its criteria."""
    target, ondelete = foreign_key_for_column(ScoreCriterion, "score_run_id")

    assert target == "application_score_run.id"
    assert ondelete == "CASCADE"
