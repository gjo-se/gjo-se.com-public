"""Unit tests for the SkillGroup ORM model (fbf_skill_group)."""

from __future__ import annotations

import pytest

from app.fbf.models.skill_group import SkillGroup

pytestmark = pytest.mark.unit


def test_skill_group_maps_to_fbf_skill_group_table() -> None:
    """The model is bound to the ``fbf_skill_group`` table."""
    assert SkillGroup.__tablename__ == "fbf_skill_group"


def test_priority_defaults_to_medium_with_check_constraint() -> None:
    """``priority`` defaults to ``medium`` and is guarded by a check constraint."""
    constraint_names = {constraint.name for constraint in SkillGroup.__table__.constraints}

    assert "ck_fbf_skill_group_priority" in constraint_names
    assert SkillGroup.__table__.c.priority.default.arg == "medium"


def test_translations_relationship_cascades_delete_orphan() -> None:
    """The ``translations`` relationship cascades delete-orphan."""
    relationship = SkillGroup.__mapper__.relationships["translations"]

    assert "delete-orphan" in relationship.cascade
