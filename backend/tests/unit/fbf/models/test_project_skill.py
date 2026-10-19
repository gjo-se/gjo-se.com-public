"""Unit tests for the ProjectSkill junction ORM model (fbf_project_skill)."""

from __future__ import annotations

import pytest

from app.fbf.models.project_skill import ProjectSkill

pytestmark = pytest.mark.unit


def test_project_skill_maps_to_fbf_project_skill_table() -> None:
    """The junction is bound to the ``fbf_project_skill`` table."""
    assert ProjectSkill.__tablename__ == "fbf_project_skill"


def test_primary_key_is_the_project_skill_pair() -> None:
    """The composite primary key is ``(project_id, skill_id)``."""
    assert {column.name for column in ProjectSkill.__table__.primary_key.columns} == {"project_id", "skill_id"}


def test_foreign_keys_target_project_and_skill() -> None:
    """Both FKs point at ``fbf_project.id`` and ``fbf_skill.id``."""
    targets = {fk.target_fullname for fk in ProjectSkill.__table__.foreign_keys}

    assert targets == {"fbf_project.id", "fbf_skill.id"}


def test_importance_is_optional() -> None:
    """``importance`` (0–5) is nullable – NULL means no data."""
    assert ProjectSkill.__table__.c.importance.nullable is True
