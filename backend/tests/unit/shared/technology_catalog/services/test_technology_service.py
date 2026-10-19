"""Unit tests for the technology-catalog query-builder guard (pure)."""

from __future__ import annotations

import pytest
from sqlalchemy import select

from app.shared.technology_catalog.models.technology import Technology
from app.shared.technology_catalog.services.technology_service import TechnologyQueryService

pytestmark = pytest.mark.unit


def test_apply_sorting_uses_a_whitelisted_column() -> None:
    """A whitelisted sort column and direction become the ORDER BY clause."""
    stmt = TechnologyQueryService._apply_sorting(select(Technology), "name", "desc")

    assert "ORDER BY shared_technology.name DESC" in str(stmt)


def test_apply_sorting_falls_back_to_name_for_unknown_column() -> None:
    """An unknown sort column cannot reach SQL and falls back to name ascending."""
    stmt = TechnologyQueryService._apply_sorting(select(Technology), "evil; DROP TABLE", "asc")

    assert "ORDER BY shared_technology.name ASC" in str(stmt)
