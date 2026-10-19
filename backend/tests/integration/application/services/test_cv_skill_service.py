"""Integration tests for the CV-skill service (real Postgres, faked ports).

The fbf-owned skill pipeline is replaced by a recording fake and the single CV
re-render is faked, so the orchestration contract is asserted without a render.
"""

from __future__ import annotations

from typing import Any

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.models.submission import Submission
from app.application.schemas.document_schemas import CvSkillAddItemIn
from app.application.services import cv_skill_service


class _FakeSkillPort:
    """Records the delegated skill-pipeline calls."""

    def __init__(self) -> None:
        """Initialize empty call logs."""
        self.added: list[tuple[int, list[str]]] = []
        self.excluded: list[str] = []

    async def add_project_skills(
        self,
        db: AsyncSession,
        *,
        project_id: int,
        names: list[str],
        core_db: AsyncSession,
        embedding_client: Any,
    ) -> None:
        """Record an add call."""
        self.added.append((project_id, list(names)))

    async def exclude_project_skill(self, db: AsyncSession, *, name: str) -> None:
        """Record an exclude call."""
        self.excluded.append(name)


@pytest.fixture()
def rendered_document(monkeypatch: pytest.MonkeyPatch) -> object:
    """Fake the single CV re-render with a sentinel and return it."""
    sentinel = object()

    async def _fake_regenerate(
        db: AsyncSession, *, submission: Submission, catalog: Any, skills: Any, use_default_skills: Any = None
    ) -> object:
        """Return the sentinel without rendering."""
        return sentinel

    monkeypatch.setattr(cv_skill_service.cv_service, "regenerate_cv_document", _fake_regenerate)
    return sentinel


pytestmark = pytest.mark.integration


async def test_add_cv_skills_delegates_and_rerenders_once(
    db_session: AsyncSession, app_submission: Submission, rendered_document: object
) -> None:
    """The add path forwards the names and returns the single regenerated CV."""
    fake = _FakeSkillPort()

    result = await cv_skill_service.add_cv_skills(
        db_session,
        submission=app_submission,
        items=[CvSkillAddItemIn(name="Go"), CvSkillAddItemIn(name="Rust")],
        core_db=db_session,
        embedding_client=None,
        catalog=None,
        skills=fake,
    )

    assert result is rendered_document
    assert fake.added == [(app_submission.project_id, ["Go", "Rust"])]


async def test_exclude_cv_skill_delegates_and_rerenders_once(
    db_session: AsyncSession, app_submission: Submission, rendered_document: object
) -> None:
    """The exclude path strips the name, delegates it and returns the new CV."""
    fake = _FakeSkillPort()

    result = await cv_skill_service.exclude_cv_skill(
        db_session,
        submission=app_submission,
        name="  Rust  ",
        catalog=None,
        skills=fake,
    )

    assert result is rendered_document
    assert fake.excluded == ["Rust"]
