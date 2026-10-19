"""Unit tests for the ``Translation`` ORM model metadata (no DB).

Covers the ``(portfolio_id, locale)`` uniqueness contract and the cascading FK.
Pure mapper inspection – no session.
"""

from __future__ import annotations

import pytest
from sqlalchemy import UniqueConstraint

from app.portfolio.models.translation import Translation

pytestmark = pytest.mark.unit


def test_translation_maps_to_expected_table_name() -> None:
    """Localized content lives in ``portfolio_translation``."""
    assert Translation.__tablename__ == "portfolio_translation"


def test_translation_is_unique_per_portfolio_and_locale() -> None:
    """At most one content row exists per ``(portfolio_id, locale)`` pair."""
    unique_columns = [
        {column.name for column in constraint.columns}
        for constraint in Translation.__table__.constraints
        if isinstance(constraint, UniqueConstraint)
    ]

    assert {"portfolio_id", "locale"} in unique_columns


def test_translation_portfolio_fk_cascades_on_delete() -> None:
    """Deleting the portfolio removes its localized content."""
    portfolio_fk = next(iter(Translation.__table__.columns["portfolio_id"].foreign_keys))

    assert portfolio_fk.target_fullname == "portfolio.id"
    assert portfolio_fk.ondelete == "CASCADE"


def test_translation_title_is_required_but_optional_fields_are_nullable() -> None:
    """Only the title is mandatory; the rest may be absent."""
    columns = Translation.__table__.columns

    assert columns["title"].nullable is False
    assert columns["sub_title"].nullable is True
    assert columns["teaser"].nullable is True
    assert columns["impact_summary"].nullable is True
