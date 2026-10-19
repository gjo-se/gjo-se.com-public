"""Integration tests for ``cv_skill_service`` against the container DB.

Covers the CV-skill add/remove pipeline (import-linter Group F) through its
public interface: resolve-or-create + link, idempotent dedup of names, and the
exclude path (detach + reject). The external embedding call is replaced by a
deterministic double – no network access.
"""

from __future__ import annotations

from typing import override

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project import Project
from app.fbf.models.skill import Skill
from app.fbf.repositories import skill_repository
from app.fbf.services import cv_skill_service
from app.shared.embedding.infrastructure.embedding_client import EmbeddingClient
from app.shared.status.models.status import Status
from app.shared.status.repositories import statusable_repository

pytestmark = [pytest.mark.integration, pytest.mark.usefixtures("mock_external_http")]

_STUB_VECTOR: list[float] = [0.1, 0.2, 0.3]


class _StubEmbeddingClient(EmbeddingClient):
    """Deterministic embedding double – fixed vector, never hits OpenRouter."""

    @override
    async def embed_text(self, text: str, db: AsyncSession) -> list[float]:
        """Return a fixed vector regardless of the input text."""
        return list(_STUB_VECTOR)


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


async def test_add_project_skills_creates_links_and_embeds_new_skill(db_session: AsyncSession) -> None:
    """A new skill is created, embedded, linked to the project and activated."""
    status_ids = await _seed_skill_statuses(db_session, "active")
    project = Project(url="https://example.test/projects/cv-add", title="CV Add")
    db_session.add(project)
    await db_session.flush()

    await cv_skill_service.add_project_skills(
        db_session,
        project_id=project.id,
        names=["Python"],
        core_db=db_session,
        embedding_client=_StubEmbeddingClient(),
    )

    skill = await skill_repository.get_by_name(db_session, "Python")
    assert skill is not None
    assert skill.vector == _STUB_VECTOR
    assert await skill_repository.count_for_project(db_session, project.id) == 1
    entry = await statusable_repository.get_status(db_session, "fbf_skill", skill.id)
    assert entry is not None
    assert entry.status.name == "active"
    assert status_ids["active"] == entry.status_id


async def test_add_project_skills_dedupes_names_and_is_idempotent(db_session: AsyncSession) -> None:
    """Duplicate/blank names collapse and a repeated call never doubles the link."""
    await _seed_skill_statuses(db_session, "active")
    project = Project(url="https://example.test/projects/cv-idempotent", title="CV Idempotent")
    db_session.add(project)
    await db_session.flush()
    client = _StubEmbeddingClient()

    await cv_skill_service.add_project_skills(
        db_session,
        project_id=project.id,
        names=["Docker", "Docker", "  "],
        core_db=db_session,
        embedding_client=client,
    )
    await cv_skill_service.add_project_skills(
        db_session,
        project_id=project.id,
        names=["Docker"],
        core_db=db_session,
        embedding_client=client,
    )

    assert await skill_repository.count_for_project(db_session, project.id) == 1


async def test_exclude_project_skill_detaches_master_and_marks_rejected(db_session: AsyncSession) -> None:
    """Excluding a slave detaches it from its master and marks it rejected."""
    await _seed_skill_statuses(db_session, "pending", "rejected")
    master = Skill(name="Backend")
    db_session.add(master)
    await db_session.flush()
    slave = Skill(name="Backend (alt)", canonical_id=master.id)
    db_session.add(slave)
    await db_session.flush()
    slave_id = slave.id

    await cv_skill_service.exclude_project_skill(db_session, name="Backend (alt)")

    stored = await skill_repository.get_by_id(db_session, slave_id)
    assert stored is not None
    assert stored.canonical_id is None
    entry = await statusable_repository.get_status(db_session, "fbf_skill", slave_id)
    assert entry is not None
    assert entry.status.name == "rejected"


async def test_exclude_project_skill_unknown_name_raises(db_session: AsyncSession) -> None:
    """Excluding a name that resolves to no skill raises a ``ValueError``."""
    with pytest.raises(ValueError, match="not found"):
        await cv_skill_service.exclude_project_skill(db_session, name="Ghost")
