"""Unit tests for the FocusAreaTranslation ORM model metadata."""

from __future__ import annotations

import pytest

from app.application.models.focus_area_translation import (
    FocusAreaTranslation,
)
from tests.unit.application.models._contract import (
    foreign_key_for_column,
    unique_constraint_columns,
)

pytestmark = pytest.mark.unit


def test_focus_area_translation_maps_to_expected_table() -> None:
    """The model is bound to ``application_focus_area_translation``."""
    assert FocusAreaTranslation.__tablename__ == "application_focus_area_translation"


def test_focus_area_translation_is_unique_per_area_and_locale() -> None:
    """At most one translation row per ``(focus_area_id, locale)`` pair."""
    columns = unique_constraint_columns(FocusAreaTranslation, "uq_application_focus_area_translation_area_locale")

    assert columns == {"focus_area_id", "locale"}


def test_focus_area_translation_title_is_required() -> None:
    """The localized ``title`` is mandatory."""
    assert FocusAreaTranslation.__table__.c.title.nullable is False


def test_focus_area_translation_cascades_with_its_area() -> None:
    """Deleting the focus area removes its translations."""
    target, ondelete = foreign_key_for_column(FocusAreaTranslation, "focus_area_id")

    assert target == "application_focus_area.id"
    assert ondelete == "CASCADE"
