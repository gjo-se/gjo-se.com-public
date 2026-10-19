"""Unit tests for the ExperienceDecisionTranslation ORM model metadata."""

from __future__ import annotations

import pytest

from app.application.models.experience_decision_translation import (
    ExperienceDecisionTranslation,
)
from tests.unit.application.models._contract import (
    foreign_key_for_column,
    unique_constraint_columns,
)

pytestmark = pytest.mark.unit


def test_decision_translation_maps_to_expected_table() -> None:
    """The model is bound to ``application_experience_decision_translation``."""
    assert ExperienceDecisionTranslation.__tablename__ == "application_experience_decision_translation"


def test_decision_translation_is_unique_per_decision_and_locale() -> None:
    """At most one translation row per ``(decision_id, locale)`` pair."""
    columns = unique_constraint_columns(
        ExperienceDecisionTranslation, "uq_application_experience_decision_translation_decision_locale"
    )

    assert columns == {"decision_id", "locale"}


def test_decision_translation_cascades_with_its_decision() -> None:
    """Deleting the decision removes its translations."""
    target, ondelete = foreign_key_for_column(ExperienceDecisionTranslation, "decision_id")

    assert target == "application_experience_decision.id"
    assert ondelete == "CASCADE"
