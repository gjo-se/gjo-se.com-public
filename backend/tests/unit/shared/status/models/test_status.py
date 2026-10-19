"""Unit tests for the shared Status/Statusable model metadata."""

from __future__ import annotations

import pytest

from app.shared.status.models.status import Status, Statusable

pytestmark = pytest.mark.unit


def test_status_uses_expected_table_name() -> None:
    """The status model maps to the shared_status table."""
    assert Status.__tablename__ == "shared_status"


def test_status_has_unique_name_category_constraint() -> None:
    """A (name, category) pair is unique by constraint."""
    constraint_names = {c.name for c in Status.__table__.constraints if c.name}

    assert "uq_shared_status_name_category" in constraint_names


def test_status_slug_column_is_unique_and_required() -> None:
    """The slug is a unique, non-nullable key."""
    column = Status.__table__.c.slug

    assert column.unique is True
    assert column.nullable is False


def test_statusable_has_unique_type_id_constraint() -> None:
    """A (statusable_type, statusable_id) pair is unique by constraint."""
    assert Statusable.__tablename__ == "shared_statusable"
    constraint_names = {c.name for c in Statusable.__table__.constraints if c.name}

    assert "uq_shared_statusable_type_id" in constraint_names
