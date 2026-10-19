"""Unit tests for the ExperienceDecision ORM model metadata."""

from __future__ import annotations

import pytest

from app.application.models.experience_decision import ExperienceDecision
from tests.unit.application.models._contract import foreign_key_for_column

pytestmark = pytest.mark.unit


def test_experience_decision_maps_to_expected_table() -> None:
    """The model is bound to ``application_experience_decision``."""
    assert ExperienceDecision.__tablename__ == "application_experience_decision"


def test_experience_decision_sort_defaults_to_zero() -> None:
    """The decision order defaults to 0."""
    assert ExperienceDecision.__table__.c.sort.default.arg == 0


def test_experience_decision_cascades_with_its_experience() -> None:
    """Deleting the experience removes its decisions."""
    target, ondelete = foreign_key_for_column(ExperienceDecision, "experience_id")

    assert target == "application_experience.id"
    assert ondelete == "CASCADE"


def test_experience_decision_owns_its_translations() -> None:
    """The decision cascades its localized rows."""
    assert "translations" in ExperienceDecision.__mapper__.relationships
