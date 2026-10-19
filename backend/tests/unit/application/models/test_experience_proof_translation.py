"""Unit tests for the ExperienceProofTranslation ORM model metadata."""

from __future__ import annotations

import pytest

from app.application.models.experience_proof_translation import (
    ExperienceProofTranslation,
)
from tests.unit.application.models._contract import (
    foreign_key_for_column,
    unique_constraint_columns,
)

pytestmark = pytest.mark.unit


def test_proof_translation_maps_to_expected_table() -> None:
    """The model is bound to ``application_experience_proof_translation``."""
    assert ExperienceProofTranslation.__tablename__ == "application_experience_proof_translation"


def test_proof_translation_is_unique_per_proof_and_locale() -> None:
    """At most one translation row per ``(proof_id, locale)`` pair."""
    columns = unique_constraint_columns(
        ExperienceProofTranslation, "uq_application_experience_proof_translation_proof_locale"
    )

    assert columns == {"proof_id", "locale"}


def test_proof_translation_cascades_with_its_proof() -> None:
    """Deleting the proof removes its translations."""
    target, ondelete = foreign_key_for_column(ExperienceProofTranslation, "proof_id")

    assert target == "application_experience_proof.id"
    assert ondelete == "CASCADE"
