"""Unit tests for the CareerEntryTranslation ORM model metadata."""

from __future__ import annotations

import pytest

from app.application.models.career_entry_translation import (
    CareerEntryTranslation,
)
from tests.unit.application.models._contract import (
    foreign_key_for_column,
    unique_constraint_columns,
)

pytestmark = pytest.mark.unit


def test_career_entry_translation_maps_to_expected_table() -> None:
    """The model is bound to ``application_career_entry_translation``."""
    assert CareerEntryTranslation.__tablename__ == "application_career_entry_translation"


def test_career_entry_translation_is_unique_per_entry_and_locale() -> None:
    """At most one translation row per ``(career_entry_id, locale)`` pair."""
    columns = unique_constraint_columns(CareerEntryTranslation, "uq_application_career_entry_translation_entry_locale")

    assert columns == {"career_entry_id", "locale"}


def test_career_entry_translation_cascades_with_its_entry() -> None:
    """Deleting the entry removes its translations (ON DELETE CASCADE)."""
    target, ondelete = foreign_key_for_column(CareerEntryTranslation, "career_entry_id")

    assert target == "application_career_entry.id"
    assert ondelete == "CASCADE"
