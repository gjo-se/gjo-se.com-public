"""Unit tests for the ``Proof`` ORM model metadata (no DB).

Covers the priority check constraint, the cascading FK to ``portfolio`` and the
default priority. Pure mapper inspection – no session.
"""

from __future__ import annotations

import pytest
from sqlalchemy import CheckConstraint

from app.portfolio.models.proof import Proof

pytestmark = pytest.mark.unit


def test_proof_maps_to_expected_table_name() -> None:
    """Proofs live in the ``portfolio_proof`` table."""
    assert Proof.__tablename__ == "portfolio_proof"


def test_proof_priority_is_restricted_to_high_and_medium() -> None:
    """A DB check constraint guards the allowed priority values."""
    check_constraints = [c.sqltext for c in Proof.__table__.constraints if isinstance(c, CheckConstraint)]

    assert any("priority IN ('high', 'medium')" in str(sqltext) for sqltext in check_constraints)


def test_proof_priority_defaults_to_medium() -> None:
    """New proofs default to the conservative ``medium`` priority."""
    assert Proof.__table__.columns["priority"].default.arg == "medium"


def test_proof_portfolio_fk_cascades_on_delete() -> None:
    """Deleting the portfolio removes its proofs."""
    portfolio_fk = next(iter(Proof.__table__.columns["portfolio_id"].foreign_keys))

    assert portfolio_fk.target_fullname == "portfolio.id"
    assert portfolio_fk.ondelete == "CASCADE"


def test_proof_translations_cascade_delete_orphans() -> None:
    """Deleting a proof removes its localized statements."""
    assert Proof.__mapper__.relationships["translations"].cascade.delete_orphan is True
