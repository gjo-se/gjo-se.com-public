"""Unit tests for the shared skill-catalog port."""

from __future__ import annotations

import dataclasses

import pytest

from app.shared.ports.skill import CvSkillLink, SkillBlend, SkillCatalogPort, get_skill_catalog_port

pytestmark = pytest.mark.unit


def test_cv_skill_link_carries_group_metadata() -> None:
    """The CV skill link projection exposes the resolved master-group fields."""
    link = CvSkillLink(
        skill_id=3,
        original_name="Python",
        level_public=4,
        group_id=2,
        group_sort=1,
        group_label="Languages",
    )

    assert link.skill_id == 3
    assert link.group_label == "Languages"


def test_skill_blend_is_frozen() -> None:
    """The blended skill projection is immutable."""
    blend = SkillBlend(skill_id=3, name="Python", level_public=4, group_id=None, sort=None, importance=0.5)

    with pytest.raises(dataclasses.FrozenInstanceError):
        blend.importance = 0.9


async def test_get_skill_catalog_port_returns_wired_port() -> None:
    """The composition root wires a concrete skill-catalog port."""
    assert isinstance(await get_skill_catalog_port(), SkillCatalogPort)
