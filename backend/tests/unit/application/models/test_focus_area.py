"""Unit tests for the FocusArea ORM model metadata."""

from __future__ import annotations

import pytest

from app.application.models.focus_area import FocusArea
from tests.unit.application.models._contract import (
    foreign_key_for_column,
    unique_constraint_columns,
)

pytestmark = pytest.mark.unit


def test_focus_area_maps_to_expected_table() -> None:
    """The model is bound to ``application_focus_area``."""
    assert FocusArea.__tablename__ == "application_focus_area"


def test_focus_area_is_unique_per_profile_and_slug() -> None:
    """At most one focus area per ``(application_profile_id, slug)`` pair."""
    columns = unique_constraint_columns(FocusArea, "uq_application_focus_area_profile_slug")

    assert columns == {"application_profile_id", "slug"}


def test_focus_area_cascades_with_its_profile() -> None:
    """Deleting the profile removes its focus areas."""
    target, ondelete = foreign_key_for_column(FocusArea, "application_profile_id")

    assert target == "application_profile.id"
    assert ondelete == "CASCADE"


def test_focus_area_owns_its_translations() -> None:
    """The focus area cascades its localized rows."""
    assert "translations" in FocusArea.__mapper__.relationships
