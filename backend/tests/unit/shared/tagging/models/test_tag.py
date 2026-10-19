"""Unit tests for the shared Tag/Taggable model metadata."""

from __future__ import annotations

import pytest

from app.shared.tagging.models.tag import Tag, Taggable

pytestmark = pytest.mark.unit


def test_tag_uses_expected_table_name() -> None:
    """The tag model maps to the shared_tag table."""
    assert Tag.__tablename__ == "shared_tag"


def test_tag_has_unique_name_category_constraint() -> None:
    """A (name, category) pair is unique by constraint."""
    constraint_names = {c.name for c in Tag.__table__.constraints if c.name}

    assert "uq_shared_tag_name_category" in constraint_names


def test_taggable_has_composite_primary_key() -> None:
    """The junction primary key spans tag_id, taggable_type and taggable_id."""
    assert Taggable.__tablename__ == "shared_taggable"
    primary_key_columns = {column.name for column in Taggable.__table__.primary_key.columns}

    assert primary_key_columns == {"tag_id", "taggable_type", "taggable_id"}
