"""Unit tests for the SkillGroupTranslation ORM model (fbf_skill_group_translation)."""

from __future__ import annotations

import pytest

from app.fbf.models.skill_group_translation import SkillGroupTranslation

pytestmark = pytest.mark.unit


def test_translation_maps_to_fbf_skill_group_translation_table() -> None:
    """The model is bound to the ``fbf_skill_group_translation`` table."""
    assert SkillGroupTranslation.__tablename__ == "fbf_skill_group_translation"


def test_group_and_locale_pair_is_unique() -> None:
    """At most one translation row per ``(skill_group_id, locale)`` pair."""
    unique_constraints = {
        constraint.name: {column.name for column in constraint.columns}
        for constraint in SkillGroupTranslation.__table__.constraints
        if constraint.name is not None and constraint.name.startswith("uq_")
    }

    assert unique_constraints["uq_fbf_skill_group_translation_group_locale"] == {"skill_group_id", "locale"}


def test_skill_group_fk_cascades_on_delete() -> None:
    """Deleting a group removes its translations (ON DELETE CASCADE)."""
    foreign_key = next(iter(SkillGroupTranslation.__table__.foreign_keys))

    assert foreign_key.target_fullname == "fbf_skill_group.id"
    assert foreign_key.ondelete == "CASCADE"
