"""Unit tests for the Experience ORM model metadata."""

from __future__ import annotations

import pytest

from app.application.models.experience import Experience
from tests.unit.application.models._contract import (
    column_names,
    foreign_key_for_column,
)

pytestmark = pytest.mark.unit


def test_experience_maps_to_expected_table() -> None:
    """The model is bound to ``application_experience``."""
    assert Experience.__tablename__ == "application_experience"


def test_experience_company_is_internal_only_and_nullable() -> None:
    """``company`` is an optional internal field (never rendered)."""
    assert Experience.__table__.c.company.nullable is True


def test_experience_sort_defaults_to_zero() -> None:
    """The sort column defaults to 0 for a fresh entry."""
    assert Experience.__table__.c.sort.default.arg == 0


def test_experience_cascades_with_its_profile() -> None:
    """Deleting the profile removes its experience projects."""
    target, ondelete = foreign_key_for_column(Experience, "application_profile_id")

    assert target == "application_profile.id"
    assert ondelete == "CASCADE"


def test_experience_owns_all_child_levels() -> None:
    """Translations, decisions and proofs belong to the experience."""
    assert {"translations", "decisions", "proofs"} <= set(Experience.__mapper__.relationships.keys())
    assert {"created_at", "updated_at"} <= column_names(Experience)
