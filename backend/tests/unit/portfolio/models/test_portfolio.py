"""Unit tests for the ``Portfolio`` ORM model metadata (no DB).

Covers the unique slug, the default sort, the timestamp mixin and the cascade
contract of the translation/proof relationships. Pure mapper inspection.
"""

from __future__ import annotations

import pytest

from app.portfolio.models.portfolio import Portfolio

pytestmark = pytest.mark.unit


def test_portfolio_maps_to_expected_table_name() -> None:
    """The aggregate root maps to the plain ``portfolio`` table."""
    assert Portfolio.__tablename__ == "portfolio"


def test_portfolio_slug_is_unique_and_required() -> None:
    """A slug must exist and be globally unique for public lookups."""
    slug_col = Portfolio.__table__.columns["slug"]

    assert slug_col.unique is True
    assert slug_col.nullable is False


def test_portfolio_sort_defaults_to_zero() -> None:
    """Unsorted portfolios fall back to ``sort`` index 0."""
    assert Portfolio.__table__.columns["sort"].default.arg == 0


def test_portfolio_has_timestamp_mixin_columns() -> None:
    """The aggregate carries created/updated timestamps."""
    columns = Portfolio.__table__.columns

    assert "created_at" in columns
    assert "updated_at" in columns


def test_portfolio_relationships_cascade_delete_orphans() -> None:
    """Deleting a portfolio removes its own translations and proofs."""
    relationships = Portfolio.__mapper__.relationships

    assert relationships["translations"].cascade.delete_orphan is True
    assert relationships["proofs"].cascade.delete_orphan is True


def test_portfolio_proofs_relationship_orders_by_sort() -> None:
    """Proofs are always loaded in their configured order."""
    proofs_relationship = Portfolio.__mapper__.relationships["proofs"]

    assert "sort" in str(proofs_relationship.order_by)
