"""Unit tests for the TechnologyIcon model metadata."""

from __future__ import annotations

import pytest

from app.shared.technology_catalog.models.technology_icon import TechnologyIcon

pytestmark = pytest.mark.unit


def test_technology_icon_uses_expected_table_name() -> None:
    """The model maps to the shared_technology_icon table."""
    assert TechnologyIcon.__tablename__ == "shared_technology_icon"


def test_technology_icon_links_to_technology_with_cascade_delete() -> None:
    """The technology FK deletes icons on cascade and is indexed."""
    column = TechnologyIcon.__table__.c.core_technology_catalog_id

    assert column.nullable is False
    assert column.index is True
    foreign_keys = {fk.target_fullname for fk in column.foreign_keys}

    assert foreign_keys == {"shared_technology.id"}


def test_technology_icon_retry_count_defaults_to_zero() -> None:
    """New icon rows start with retry_count 0."""
    column = TechnologyIcon.__table__.c.retry_count

    assert column.nullable is False
