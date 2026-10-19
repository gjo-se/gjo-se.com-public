"""Unit tests for the Profile ORM model metadata (application_profile)."""

from __future__ import annotations

import pytest

from app.application.models.profile import Profile
from tests.unit.application.models._contract import column_names

pytestmark = pytest.mark.unit


def test_profile_maps_to_application_profile_table() -> None:
    """The model is bound to the ``application_profile`` table."""
    assert Profile.__tablename__ == "application_profile"


def test_profile_full_name_is_required() -> None:
    """``full_name`` is the mandatory identity field (NOT NULL)."""
    assert Profile.__table__.c.full_name.nullable is False


def test_profile_hourly_rate_is_optional_numeric() -> None:
    """``hourly_rate`` is an optional decimal (no fabricated default)."""
    column = Profile.__table__.c.hourly_rate

    assert column.nullable is True
    assert column.type.precision == 10
    assert column.type.scale == 2


def test_profile_owns_career_focus_and_translation_collections() -> None:
    """The singleton profile cascades its child collections."""
    relationships = set(Profile.__mapper__.relationships.keys())

    assert {"career_entries", "focus_areas", "translations"} <= relationships


def test_profile_has_timestamps() -> None:
    """The profile carries created/updated timestamps."""
    assert {"created_at", "updated_at"} <= column_names(Profile)
