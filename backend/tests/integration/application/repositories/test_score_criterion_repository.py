"""Integration tests for the score-criterion repository (real Postgres)."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.domain.application_score_rubric_rules import (
    CANONICAL_CRITERIA_KEYS,
    CriterionScore,
)
from app.application.models.submission import Submission
from app.application.repositories import score_criterion_repository, score_run_repository
from app.fbf.models.project import Project

pytestmark = pytest.mark.integration


async def _run_id(db: AsyncSession, submission: Submission, project: Project) -> int:
    """Persist a score run to attach criteria to and return its id."""
    run = await score_run_repository.create_run(
        db,
        application_submission_id=submission.id,
        project_id=project.id,
        weights_version="v1",
    )
    return run.id


async def test_create_rows_fills_the_canon_and_list_by_run_keeps_canon_order(
    db_session: AsyncSession, app_submission: Submission, fbf_project: Project
) -> None:
    """The canon-ordered rows are persisted; unassessed keys become data gaps."""
    run_id = await _run_id(db_session, app_submission, fbf_project)
    scores = [CriterionScore(key="must_skills", group="inhalt", value=1.0, weight=20)]

    created = await score_criterion_repository.create_rows(db_session, run_id, scores)

    assert [row.criterion_key for row in created] == list(CANONICAL_CRITERIA_KEYS)
    by_key = {row.criterion_key: row for row in created}
    assert by_key["must_skills"].value == pytest.approx(1.0)
    assert by_key["semantic_fit"].value is None


async def test_list_by_run_scopes_to_the_run(
    db_session: AsyncSession, app_submission: Submission, fbf_project: Project
) -> None:
    """Only criteria of the requested run are returned."""
    run_id = await _run_id(db_session, app_submission, fbf_project)
    await score_criterion_repository.create_rows(
        db_session,
        run_id,
        [CriterionScore(key="must_skills", group="inhalt", value=0.5, weight=20)],
    )

    assert await score_criterion_repository.list_by_run(db_session, run_id + 1) == []
