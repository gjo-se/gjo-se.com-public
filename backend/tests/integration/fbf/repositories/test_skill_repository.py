"""Integration tests for ``skill_repository``.

Verifies the Skill-aggregate reads against the real (container) database:
master-resolved ``project_skill`` link resolution (count/scored), group skill
counts and the master-project filter wiring into the Project owner. Public
interface only.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project import Project
from app.fbf.models.skill import Skill
from app.fbf.models.skill_group import SkillGroup
from app.fbf.repositories import project_skill_repository, skill_repository
from app.fbf.repositories.skill_repository import SkillFilter

pytestmark = pytest.mark.integration


async def test_count_for_project_resolves_slave_links_to_master(db_session: AsyncSession) -> None:
    """Links to a slave skill and its master collapse to one master count."""
    project = Project(url="https://example.test/projects/master", title="Master Projekt")
    master = Skill(name="FastAPI")
    db_session.add_all([project, master])
    await db_session.flush()
    slave = Skill(name="FastAPI (alt)", canonical_id=master.id)
    db_session.add(slave)
    await db_session.flush()
    await project_skill_repository.link(db_session, project.id, master.id, importance=3)
    await project_skill_repository.link(db_session, project.id, slave.id, importance=3)

    assert await skill_repository.count_for_project(db_session, project.id) == 1


async def test_get_scored_skills_returns_linked_master_with_importance(db_session: AsyncSession) -> None:
    """The scored read path returns the linked master and its project importance."""
    project = Project(url="https://example.test/projects/scored", title="Scored Projekt")
    skill = Skill(name="PostgreSQL")
    db_session.add_all([project, skill])
    await db_session.flush()
    await project_skill_repository.link(db_session, project.id, skill.id, importance=5)

    rows = await skill_repository.get_scored_skills(db_session, project.id)

    assert len(rows) == 1
    assert rows[0][0].id == skill.id
    assert rows[0][1] == 5


async def test_count_by_group_counts_assigned_skills(db_session: AsyncSession) -> None:
    """Only skills assigned to the given group are counted."""
    group = SkillGroup(sort=0, priority="base")
    other = SkillGroup(sort=1, priority="base")
    db_session.add_all([group, other])
    await db_session.flush()
    db_session.add_all(
        [
            Skill(name="Gruppiert A", group_id=group.id),
            Skill(name="Gruppiert B", group_id=group.id),
            Skill(name="Andere Gruppe", group_id=other.id),
        ]
    )
    await db_session.flush()

    assert await skill_repository.count_by_group(db_session, group.id) == 2


async def test_count_by_group_ids_batches_and_omits_empty_groups(db_session: AsyncSession) -> None:
    """The batch count maps only groups that have at least one skill."""
    group = SkillGroup(sort=0, priority="base")
    empty = SkillGroup(sort=1, priority="base")
    db_session.add_all([group, empty])
    await db_session.flush()
    db_session.add(Skill(name="Eins", group_id=group.id))
    await db_session.flush()

    counts = await skill_repository.count_by_group_ids(db_session)

    assert counts.get(group.id) == 1
    assert empty.id not in counts


async def test_get_paginated_with_counts_masters_only_excludes_slave_projects(db_session: AsyncSession) -> None:
    """``masters_only`` (Project-owner filter) counts only master projects."""
    master = Project(url="https://example.test/projects/master-only", title="Master")
    slave = Project(url="https://example.test/projects/slave-only", title="Slave")
    skill = Skill(name="Kubernetes")
    db_session.add_all([master, slave, skill])
    await db_session.flush()
    slave.canonical_id = master.id
    await db_session.flush()
    await project_skill_repository.link(db_session, master.id, skill.id, importance=5)
    await project_skill_repository.link(db_session, slave.id, skill.id, importance=5)

    rows = await skill_repository.get_paginated_with_counts(db_session, SkillFilter(), masters_only=True)

    row = next(r for r in rows if r[0].id == skill.id)
    assert row[1] == 1
