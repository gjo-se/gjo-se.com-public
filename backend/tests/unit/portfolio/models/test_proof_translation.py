"""Unit tests for the ``ProofTranslation`` ORM model metadata (no DB).

Covers the ``(proof_id, locale)`` uniqueness contract and the cascading FK.
Pure mapper inspection – no session.
"""

from __future__ import annotations

import pytest
from sqlalchemy import UniqueConstraint

from app.portfolio.models.proof_translation import ProofTranslation

pytestmark = pytest.mark.unit


def test_proof_translation_maps_to_expected_table_name() -> None:
    """Localized statements live in ``portfolio_proof_translation``."""
    assert ProofTranslation.__tablename__ == "portfolio_proof_translation"


def test_proof_translation_is_unique_per_proof_and_locale() -> None:
    """At most one statement row exists per ``(proof_id, locale)`` pair."""
    unique_columns = [
        {column.name for column in constraint.columns}
        for constraint in ProofTranslation.__table__.constraints
        if isinstance(constraint, UniqueConstraint)
    ]

    assert {"proof_id", "locale"} in unique_columns


def test_proof_translation_proof_fk_cascades_on_delete() -> None:
    """Deleting the proof removes its localized statements."""
    proof_fk = next(iter(ProofTranslation.__table__.columns["proof_id"].foreign_keys))

    assert proof_fk.target_fullname == "portfolio_proof.id"
    assert proof_fk.ondelete == "CASCADE"


def test_proof_translation_statement_is_required() -> None:
    """The statement column is NOT NULL; only ``question`` is optional."""
    columns = ProofTranslation.__table__.columns

    assert columns["statement"].nullable is False
    assert columns["question"].nullable is True
