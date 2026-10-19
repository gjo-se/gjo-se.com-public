"""Integration tests for the submission service (real Postgres).

Covers the project move (old→new master) with its single-current guard and the
promotion of a submission to current within its project.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.exceptions import ApplicationDeleteError, ApplicationPrepareError
from app.application.models.profile import Profile
from app.application.models.submission import Submission
from app.application.repositories import submission_list_repository, submission_repository
from app.application.services import submission_service
from app.fbf.models.project import Project

pytestmark = pytest.mark.integration


async def _submission(
    db: AsyncSession, profile: Profile, project: Project, *, is_current: bool, subject: str
) -> Submission:
    """Persist a submission on the given project."""
    submission = Submission(
        project_id=project.id,
        sender_profile_id=profile.id,
        subject=subject,
        body="Body",
        language="de",
        is_current=is_current,
        sender_email="person@example.test",
        recipient_email="hr@example-kunde.test",
    )
    db.add(submission)
    await db.flush()
    return submission


async def test_move_returns_false_without_source(db_session: AsyncSession, fbf_project: Project) -> None:
    """A source project without a current submission is a no-op."""
    moved = await submission_service.move_to_project(
        db_session, from_project_id=fbf_project.id, to_project_id=fbf_project.id + 1
    )

    assert moved is False


async def test_move_repoints_the_submission_to_the_target(
    db_session: AsyncSession, app_profile: Profile, fbf_project: Project
) -> None:
    """The source's current submission is re-pointed to the target project."""
    target = Project(url="https://example.test/projects/2", title="Zielprojekt")
    db_session.add(target)
    await db_session.flush()
    submission = await _submission(db_session, app_profile, fbf_project, is_current=True, subject="A")

    moved = await submission_service.move_to_project(
        db_session, from_project_id=fbf_project.id, to_project_id=target.id
    )

    assert moved is True
    assert submission.project_id == target.id
    assert await submission_repository.get_current_by_project(db_session, fbf_project.id) is None


async def test_move_refuses_when_target_already_has_a_current(
    db_session: AsyncSession, app_profile: Profile, fbf_project: Project
) -> None:
    """A target with its own current submission refuses the move (409)."""
    target = Project(url="https://example.test/projects/3", title="Belegtes Ziel")
    db_session.add(target)
    await db_session.flush()
    await _submission(db_session, app_profile, fbf_project, is_current=True, subject="Quelle")
    await _submission(db_session, app_profile, target, is_current=True, subject="Ziel")

    with pytest.raises(ApplicationPrepareError) as exc:
        await submission_service.move_to_project(db_session, from_project_id=fbf_project.id, to_project_id=target.id)

    assert exc.value.status_code == 409


async def test_set_current_submission_promotes_and_demotes(
    db_session: AsyncSession, app_profile: Profile, fbf_project: Project
) -> None:
    """Promoting one submission demotes the project's other rows."""
    await _submission(db_session, app_profile, fbf_project, is_current=True, subject="Alt")
    promoted = await _submission(db_session, app_profile, fbf_project, is_current=False, subject="Neu")

    updated = await submission_service.set_current_submission(db_session, submission_id=promoted.id)

    assert updated.id == promoted.id
    rows = await submission_list_repository.list_paginated(db_session, project_id=fbf_project.id)
    flags = {row.subject: row.is_current for row, _status in rows}
    assert flags == {"Alt": False, "Neu": True}


async def test_set_current_submission_raises_for_unknown_id(db_session: AsyncSession) -> None:
    """An unknown submission id is reported as 404."""
    with pytest.raises(ApplicationDeleteError) as exc:
        await submission_service.set_current_submission(db_session, submission_id=999_999)

    assert exc.value.status_code == 404
