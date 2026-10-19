"""Integration tests for the submission repository (real Postgres).

Covers the single-current rule (read / demote / promote) and deletion. The
paginated list/count filters live in ``test_submission_list_repository``.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.models.profile import Profile
from app.application.models.submission import Submission
from app.application.repositories import submission_list_repository, submission_repository
from app.fbf.models.project import Project

pytestmark = pytest.mark.integration


async def _submission(
    db: AsyncSession,
    profile: Profile,
    project: Project,
    *,
    subject: str,
    is_current: bool = True,
    created_at: datetime | None = None,
) -> Submission:
    """Persist one submission on the given project."""
    submission = Submission(
        project_id=project.id,
        sender_profile_id=profile.id,
        subject=subject,
        body="Body",
        language="de",
        is_current=is_current,
        sender_email="person@example.test",
        recipient_email="hr@example-kunde.test",
        created_at=created_at or datetime(2026, 1, 1, tzinfo=UTC),
    )
    db.add(submission)
    await db.flush()
    return submission


async def test_get_by_id_round_trips(db_session: AsyncSession, app_profile: Profile, fbf_project: Project) -> None:
    """A persisted submission is readable by its id."""
    created = await _submission(db_session, app_profile, fbf_project, subject="A")

    fetched = await submission_repository.get_by_id(db_session, created.id)

    assert fetched is not None
    assert fetched.subject == "A"


async def test_get_current_by_project_returns_only_the_current_row(
    db_session: AsyncSession, app_profile: Profile, fbf_project: Project
) -> None:
    """Only the row flagged ``is_current`` is resolved."""
    await _submission(db_session, app_profile, fbf_project, subject="Alt", is_current=False)
    current = await _submission(db_session, app_profile, fbf_project, subject="Aktuell", is_current=True)

    resolved = await submission_repository.get_current_by_project(db_session, fbf_project.id)

    assert resolved is not None
    assert resolved.id == current.id


async def test_demote_current_flags_every_row(
    db_session: AsyncSession, app_profile: Profile, fbf_project: Project
) -> None:
    """``demote_current`` clears the current flag for the whole project."""
    await _submission(db_session, app_profile, fbf_project, subject="A", is_current=True)

    await submission_repository.demote_current(db_session, fbf_project.id)

    assert await submission_repository.get_current_by_project(db_session, fbf_project.id) is None
    rows = await submission_list_repository.list_paginated(db_session, project_id=fbf_project.id)
    assert all(row.is_current is False for row, _status in rows)


async def test_set_current_promotes_one_and_demotes_others(
    db_session: AsyncSession, app_profile: Profile, fbf_project: Project
) -> None:
    """Promoting a submission demotes the project's other rows."""
    other = await _submission(db_session, app_profile, fbf_project, subject="A", is_current=True)
    promoted = await _submission(db_session, app_profile, fbf_project, subject="B", is_current=False)

    await submission_repository.set_current(db_session, promoted.id)

    rows = await submission_list_repository.list_paginated(db_session, project_id=fbf_project.id)
    flags = {row.subject: row.is_current for row, _status in rows}
    assert flags == {"A": False, "B": True}
    assert other.id != promoted.id


async def test_delete_removes_the_submission(
    db_session: AsyncSession, app_profile: Profile, fbf_project: Project
) -> None:
    """A deleted submission is gone afterwards."""
    submission = await _submission(db_session, app_profile, fbf_project, subject="Weg")

    await submission_repository.delete_by_id(db_session, submission.id)

    assert await submission_repository.get_by_id(db_session, submission.id) is None
