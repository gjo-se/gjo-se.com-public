"""Integration tests for the ``extract_activity`` (skill extraction).

The LLM structured-output call (task ``skill-extraction``) is replaced by the
deterministic ``llm_double``; extraction, persistence and linking run against
the real container database.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.activities import extract_activity
from app.fbf.models.project import Project
from app.fbf.models.project_skill import ProjectSkill
from app.fbf.repositories import skill_repository
from app.fbf.services.skill_extraction_service import ExtractedSkill, SkillExtractionResult

pytestmark = pytest.mark.integration


async def test_run_extracts_and_links_skill_for_master(db_session: AsyncSession, llm_double) -> None:
    """An extracted skill is persisted and linked to the master project."""
    master = Project(
        url="https://example.test/projects/extract",
        title="Extract Master",
        merged_description_de="Konsolidierte Beschreibung ohne Skillname.",
    )
    db_session.add(master)
    await db_session.flush()
    master_id = master.id
    await db_session.commit()

    llm_double.set_response(
        "skill-extraction",
        SkillExtractionResult(skills=[ExtractedSkill(name="Python", importance_guess=5)]),
    )

    result = await extract_activity.run(MagicMock(), {"project_id": master_id, "trigger": "pipeline"})

    assert result == {"ok": True, "skills_count": 1, "project_id": master_id}

    db_session.expire_all()
    skill = await skill_repository.get_by_name(db_session, "Python")
    assert skill is not None
    link = await db_session.get(ProjectSkill, {"project_id": master_id, "skill_id": skill.id})
    assert link is not None


async def test_run_returns_failure_when_project_missing(db_session: AsyncSession, llm_double) -> None:
    """A missing master yields a plain failure result instead of an exception."""
    result = await extract_activity.run(MagicMock(), {"project_id": 999999, "trigger": "pipeline"})

    assert result["ok"] is False
    assert result["project_id"] == 999999
    assert "999999" in result["error"]
