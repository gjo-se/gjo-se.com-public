"""Unit tests for the CareerEntry ORM model metadata."""

from __future__ import annotations

import pytest

from app.application.models.career_entry import CareerEntry
from tests.unit.application.models._contract import (
    column_names,
    foreign_key_for_column,
)

pytestmark = pytest.mark.unit


def test_career_entry_maps_to_expected_table() -> None:
    """The model is bound to ``application_career_entry``."""
    assert CareerEntry.__tablename__ == "application_career_entry"


def test_career_entry_required_fields() -> None:
    """``position``, ``start_date`` and ``sort`` are mandatory."""
    table = CareerEntry.__table__

    assert table.c.position.nullable is False
    assert table.c.start_date.nullable is False
    assert table.c.sort.nullable is False


def test_career_entry_cascades_with_its_profile() -> None:
    """Deleting the profile removes its career entries (ON DELETE CASCADE)."""
    target, ondelete = foreign_key_for_column(CareerEntry, "application_profile_id")

    assert target == "application_profile.id"
    assert ondelete == "CASCADE"


def test_career_entry_has_timestamps_and_owned_translations() -> None:
    """The entry carries timestamps and cascades its translations."""
    assert {"created_at", "updated_at"} <= column_names(CareerEntry)
    assert "translations" in CareerEntry.__mapper__.relationships
