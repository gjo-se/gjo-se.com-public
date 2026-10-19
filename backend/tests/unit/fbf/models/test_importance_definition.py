"""Unit tests for the ImportanceDefinition ORM model (fbf_importance_definition)."""

from __future__ import annotations

import pytest
from sqlalchemy import SmallInteger

from app.fbf.models.importance_definition import ImportanceDefinition

pytestmark = pytest.mark.unit


def test_importance_definition_maps_to_fbf_importance_definition_table() -> None:
    """The model is bound to the ``fbf_importance_definition`` table."""
    assert ImportanceDefinition.__tablename__ == "fbf_importance_definition"
    assert "fbf_importance_definition" in ImportanceDefinition.metadata.tables


def test_importance_is_the_smallint_primary_key() -> None:
    """``importance`` is the 0–5 scale primary key."""
    column = ImportanceDefinition.__table__.c.importance

    assert column.primary_key is True
    assert isinstance(column.type, SmallInteger)


def test_label_and_description_are_required() -> None:
    """``label`` and ``description`` are non-nullable text columns."""
    assert ImportanceDefinition.__table__.c.label.nullable is False
    assert ImportanceDefinition.__table__.c.description.nullable is False
