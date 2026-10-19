"""Unit tests for the ExperienceProof ORM model metadata."""

from __future__ import annotations

import pytest

from app.application.models.experience_proof import ExperienceProof
from tests.unit.application.models._contract import foreign_key_for_column

pytestmark = pytest.mark.unit


def test_experience_proof_maps_to_expected_table() -> None:
    """The model is bound to ``application_experience_proof``."""
    assert ExperienceProof.__tablename__ == "application_experience_proof"


def test_experience_proof_sort_defaults_to_zero() -> None:
    """The proof order defaults to 0."""
    assert ExperienceProof.__table__.c.sort.default.arg == 0


def test_experience_proof_cascades_with_its_experience() -> None:
    """Deleting the experience removes its proofs."""
    target, ondelete = foreign_key_for_column(ExperienceProof, "experience_id")

    assert target == "application_experience.id"
    assert ondelete == "CASCADE"


def test_experience_proof_owns_its_translations() -> None:
    """The proof cascades its localized rows."""
    assert "translations" in ExperienceProof.__mapper__.relationships
