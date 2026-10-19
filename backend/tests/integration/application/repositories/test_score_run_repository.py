"""Integration tests for the score-run repository (real Postgres).

Covers the append-only history ordering (``created_at`` DESC, ``id`` as
tie-breaker) and the batch latest-run lookup used by the submission list.
"""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.models.submission import Submission
from app.application.repositories import score_run_repository
from app.application.schemas.score_schemas import ScoreRunOut
from app.fbf.models.project import Project

pytestmark = pytest.mark.integration


async def _run(db: AsyncSession, submission: Submission, project: Project) -> ScoreRunOut:
    """Persist one score run (creation time is set by the repository)."""
    return await score_run_repository.create_run(
        db,
        application_submission_id=submission.id,
        project_id=project.id,
        weights_version="v1",
    )


async def test_create_and_get_by_id_round_trips(
    db_session: AsyncSession, app_submission: Submission, fbf_project: Project
) -> None:
    """A created run is readable by its id."""
    created = await _run(db_session, app_submission, fbf_project)

    fetched = await score_run_repository.get_by_id(db_session, created.id)

    assert fetched is not None
    assert fetched.weights_version == "v1"
    assert fetched.requirements == []


async def test_get_by_id_returns_none_for_unknown_id(db_session: AsyncSession) -> None:
    """An unknown id yields ``None``."""
    assert await score_run_repository.get_by_id(db_session, 999_999) is None


async def test_get_latest_by_submission_picks_newest_run(
    db_session: AsyncSession, app_submission: Submission, fbf_project: Project
) -> None:
    """The newest run wins (``created_at`` DESC, ``id`` as tie-breaker)."""
    await _run(db_session, app_submission, fbf_project)
    newest = await _run(db_session, app_submission, fbf_project)

    latest = await score_run_repository.get_latest_by_submission(db_session, app_submission.id)

    assert latest is not None
    assert latest.id == newest.id


async def test_get_latest_by_submission_returns_none_without_runs(db_session: AsyncSession) -> None:
    """A submission without a run yields ``None``."""
    assert await score_run_repository.get_latest_by_submission(db_session, 999_999) is None


async def test_list_history_returns_newest_first(
    db_session: AsyncSession, app_submission: Submission, fbf_project: Project
) -> None:
    """The history is ordered newest first."""
    older = await _run(db_session, app_submission, fbf_project)
    newer = await _run(db_session, app_submission, fbf_project)

    history = await score_run_repository.list_history_by_submission(db_session, app_submission.id)

    assert [run.id for run in history] == [newer.id, older.id]


async def test_get_latest_by_submissions_maps_and_ignores_missing(
    db_session: AsyncSession, app_submission: Submission, fbf_project: Project
) -> None:
    """The batch lookup maps per submission id and ignores ids without a run."""
    run = await _run(db_session, app_submission, fbf_project)

    result = await score_run_repository.get_latest_by_submissions(db_session, [app_submission.id, 999_999])

    assert result[app_submission.id].id == run.id
    assert 999_999 not in result
    assert await score_run_repository.get_latest_by_submissions(db_session, []) == {}


async def test_finalize_persists_completion(
    db_session: AsyncSession, app_submission: Submission, fbf_project: Project
) -> None:
    """Finalizing a run persists score, verdict and completion time."""
    run = await _run(db_session, app_submission, fbf_project)

    finalized = await score_run_repository.finalize(
        db_session,
        run.id,
        requirements=[{"text": "Python", "kind": "must"}],
        total_score=Decimal("87.00"),
        verdict="ready",
        llm_call_log_id=None,
        completed_at=datetime(2026, 1, 1, 1, tzinfo=UTC),
    )

    assert finalized.verdict == "ready"
    assert finalized.completed_at is not None
    assert finalized.requirements[0].text == "Python"
