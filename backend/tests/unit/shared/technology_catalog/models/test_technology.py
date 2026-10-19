"""Unit tests for the Technology model metadata."""

from __future__ import annotations

import pytest

from app.shared.technology_catalog.models.technology import Technology

pytestmark = pytest.mark.unit


def test_technology_uses_expected_table_name() -> None:
    """The model maps to the shared_technology table."""
    assert Technology.__tablename__ == "shared_technology"


def test_technology_slug_and_external_id_are_unique() -> None:
    """Both the internal slug and the external catalog id are unique keys."""
    table = Technology.__table__

    assert table.c.slug.unique is True
    assert table.c.external_id.unique is True


def test_technology_inherits_timestamp_columns() -> None:
    """The model exposes the mixin's created_at/updated_at columns."""
    table = Technology.__table__

    assert "created_at" in table.c
    assert "updated_at" in table.c
