"""Integration tests for ``project_skill_repository``.

Verifies the Project↔Skill junction seam against the real (container) database:
idempotent linking and deletion of the raw junction rows. The skill-resolving
reads (master resolution, scored/active skill projections) belong to the Skill
aggregate and are covered in ``test_skill_repository.py``. Public interface only.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project import Project
from app.fbf.models.skill import Skill
from app.fbf.repositories import project_skill_repository, skill_repository

pytestmark = pytest.mark.integration


async def test_link_creates_row_once_and_is_idempotent(db_session: AsyncSession) -> None:
    """A repeated link for the same pair reports False and never duplicates the row."""
    project = Project(url="https://example.test/projects/link", title="Link Projekt")
    skill = Skill(name="Python")
    db_session.add_all([project, skill])
    await db_session.flush()

    first = await project_skill_repository.link(db_session, project.id, skill.id, importance=4)
    second = await project_skill_repository.link(db_session, project.id, skill.id, importance=5)

    assert first is True
    assert second is False
    assert await skill_repository.count_for_project(db_session, project.id) == 1


async def test_delete_by_project_removes_all_links(db_session: AsyncSession) -> None:
    """Deleting the project's links clears the junction completely."""
    project = Project(url="https://example.test/projects/delete", title="Delete Projekt")
    skills = [Skill(name="Docker"), Skill(name="Kubernetes")]
    db_session.add_all([project, *skills])
    await db_session.flush()
    for skill in skills:
        await project_skill_repository.link(db_session, project.id, skill.id, importance=2)

    removed = await project_skill_repository.delete_by_project(db_session, project.id)

    assert removed == 2
    assert await skill_repository.count_for_project(db_session, project.id) == 0
