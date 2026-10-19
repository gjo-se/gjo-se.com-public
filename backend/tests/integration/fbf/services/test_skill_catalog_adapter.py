"""Integration tests for ``skill_catalog_adapter`` against the container DB.

Exercises the real skill-catalog port adapter through its public interface with a
live Postgres session – the persistence seam the application context consumes
(CV skill links, public skill/group projections).
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project import Project
from app.fbf.models.skill import Skill
from app.fbf.models.skill_group import SkillGroup
from app.fbf.models.skill_group_translation import SkillGroupTranslation
from app.fbf.repositories import project_skill_repository
from app.fbf.services.skill_catalog_adapter import SkillCatalogAdapter
from app.shared.status.models.status import Status
from app.shared.status.repositories import statusable_repository

pytestmark = pytest.mark.integration


async def _seed_skill_statuses(db: AsyncSession, *names: str) -> dict[str, int]:
    """Persist ``fbf_skill``-scoped statuses and return ``name -> id``."""
    ids: dict[str, int] = {}
    for index, name in enumerate(names):
        status = Status(
            name=name,
            slug=f"fbf-skill-{name}",
            category="general",
            color_token="gray",
            sort_order=float(index),
            scope=["fbf_skill"],
        )
        db.add(status)
        await db.flush()
        ids[name] = status.id
    return ids


async def test_get_cv_skill_links_returns_active_grouped_master(db_session: AsyncSession) -> None:
    """A linked active master with a group is projected into a ``CvSkillLink``."""
    status_ids = await _seed_skill_statuses(db_session, "active")
    group = SkillGroup(sort=0, priority="base")
    db_session.add(group)
    await db_session.flush()
    db_session.add(SkillGroupTranslation(skill_group_id=group.id, locale="de", label="Backend"))
    master = Skill(name="Python", level_public=4, group_id=group.id)
    db_session.add(master)
    await db_session.flush()
    await statusable_repository.set_status(db_session, "fbf_skill", master.id, status_ids["active"])
    project = Project(url="https://example.test/projects/cv-links", title="CV Links")
    db_session.add(project)
    await db_session.flush()
    await project_skill_repository.link(db_session, project.id, master.id, importance=5)

    links = await SkillCatalogAdapter().get_cv_skill_links(db_session, project.id)

    assert len(links) == 1
    assert links[0].skill_id == master.id
    assert links[0].original_name == "Python"
    assert links[0].level_public == 4
    assert links[0].group_id == group.id
    assert links[0].group_label == "Backend"


async def test_list_public_profile_skills_returns_active_positive_level(db_session: AsyncSession) -> None:
    """Only active skills with a positive public level are returned."""
    status_ids = await _seed_skill_statuses(db_session, "active")
    visible = Skill(name="Visible Skill", level_public=3)
    hidden = Skill(name="Hidden Skill", level_public=0)
    db_session.add_all([visible, hidden])
    await db_session.flush()
    await statusable_repository.set_status(db_session, "fbf_skill", visible.id, status_ids["active"])

    result = await SkillCatalogAdapter().list_public_profile_skills(db_session)

    names = {ref.name for ref in result}
    assert "Visible Skill" in names
    assert "Hidden Skill" not in names


async def test_list_public_groups_localizes_label_with_de_fallback(db_session: AsyncSession) -> None:
    """The label follows the requested locale and falls back to German."""
    first = SkillGroup(sort=0, priority="base")
    second = SkillGroup(sort=1, priority="base")
    db_session.add_all([first, second])
    await db_session.flush()
    db_session.add_all(
        [
            SkillGroupTranslation(skill_group_id=first.id, locale="de", label="Backend"),
            SkillGroupTranslation(skill_group_id=first.id, locale="en", label="Backend EN"),
            SkillGroupTranslation(skill_group_id=second.id, locale="de", label="Frontend"),
        ]
    )
    await db_session.flush()

    adapter = SkillCatalogAdapter()
    english = await adapter.list_public_groups(db_session, "en")
    fallback = await adapter.list_public_groups(db_session, "fr")

    assert [(group.id, group.label) for group in english] == [(first.id, "Backend EN"), (second.id, "Frontend")]
    assert [(group.id, group.label) for group in fallback] == [(first.id, "Backend"), (second.id, "Frontend")]


async def test_exclude_project_skill_unknown_name_raises(db_session: AsyncSession) -> None:
    """Excluding a name that resolves to no skill raises a ``ValueError``."""
    with pytest.raises(ValueError, match="not found"):
        await SkillCatalogAdapter().exclude_project_skill(db_session, name="Ghost")
