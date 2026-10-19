"""Unit tests for the LevelDefinition ORM model (fbf_level_definition)."""

from __future__ import annotations

import pytest
from sqlalchemy import SmallInteger

from app.fbf.models.level_definition import LevelDefinition

pytestmark = pytest.mark.unit


def test_level_definition_maps_to_fbf_level_definition_table() -> None:
    """The model is bound to the ``fbf_level_definition`` table."""
    assert LevelDefinition.__tablename__ == "fbf_level_definition"
    assert "fbf_level_definition" in LevelDefinition.metadata.tables


def test_level_is_the_smallint_primary_key() -> None:
    """``level`` is the 0–5 scale primary key."""
    column = LevelDefinition.__table__.c.level

    assert column.primary_key is True
    assert isinstance(column.type, SmallInteger)


def test_label_and_description_are_required() -> None:
    """``label`` and ``description`` are non-nullable text columns."""
    assert LevelDefinition.__table__.c.label.nullable is False
    assert LevelDefinition.__table__.c.description.nullable is False
