"""Unit tests for the ProfileTranslation ORM model metadata."""

from __future__ import annotations

import pytest

from app.application.models.profile_translation import ProfileTranslation
from tests.unit.application.models._contract import (
    foreign_key_for_column,
    unique_constraint_columns,
)

pytestmark = pytest.mark.unit


def test_profile_translation_maps_to_expected_table() -> None:
    """The model is bound to ``application_profile_translation``."""
    assert ProfileTranslation.__tablename__ == "application_profile_translation"


def test_profile_translation_is_unique_per_profile_and_locale() -> None:
    """At most one translation row per ``(profile_id, locale)`` pair."""
    columns = unique_constraint_columns(ProfileTranslation, "uq_application_profile_translation_profile_locale")

    assert columns == {"profile_id", "locale"}


def test_profile_translation_cascades_with_its_profile() -> None:
    """Deleting the profile removes its translations (ON DELETE CASCADE)."""
    target, ondelete = foreign_key_for_column(ProfileTranslation, "profile_id")

    assert target == "application_profile.id"
    assert ondelete == "CASCADE"
