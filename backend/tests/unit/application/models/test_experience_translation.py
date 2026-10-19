"""Unit tests for the ExperienceTranslation ORM model metadata."""

from __future__ import annotations

import pytest

from app.application.models.experience_translation import (
    ExperienceTranslation,
)
from tests.unit.application.models._contract import (
    foreign_key_for_column,
    unique_constraint_columns,
)

pytestmark = pytest.mark.unit


def test_experience_translation_maps_to_expected_table() -> None:
    """The model is bound to ``application_experience_translation``."""
    assert ExperienceTranslation.__tablename__ == "application_experience_translation"


def test_experience_translation_is_unique_per_experience_and_locale() -> None:
    """At most one translation row per ``(experience_id, locale)`` pair."""
    columns = unique_constraint_columns(
        ExperienceTranslation, "uq_application_experience_translation_experience_locale"
    )

    assert columns == {"experience_id", "locale"}


def test_experience_translation_cascades_with_its_experience() -> None:
    """Deleting the experience removes its translations."""
    target, ondelete = foreign_key_for_column(ExperienceTranslation, "experience_id")

    assert target == "application_experience.id"
    assert ondelete == "CASCADE"
