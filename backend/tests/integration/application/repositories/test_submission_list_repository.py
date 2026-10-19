"""Integration tests for ``submission_list_repository`` (real Postgres).

Covers the paginated filter set (project / numeric and text search / date range)
and the count that mirrors the same filters.
"""

from __future__ import annotations

from datetime import UTC, date, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.models.profile import Profile
from app.application.models.submission import Submission
from app.application.repositories import submission_list_repository
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


async def test_list_paginated_filters_by_project(
    db_session: AsyncSession, app_profile: Profile, fbf_project: Project
) -> None:
    """A project filter scopes the page to that project."""
    await _submission(db_session, app_profile, fbf_project, subject="A")

    rows = await submission_list_repository.list_paginated(db_session, project_id=fbf_project.id)
    empty = await submission_list_repository.list_paginated(db_session, project_id=fbf_project.id + 1)

    assert [row.subject for row, _status in rows] == ["A"]
    assert empty == []


async def test_list_paginated_numeric_query_matches_project_id_exactly(
    db_session: AsyncSession, app_profile: Profile, fbf_project: Project
) -> None:
    """A purely numeric query is an exact project-id match, not a partial one."""
    await _submission(db_session, app_profile, fbf_project, subject="A")

    hits = await submission_list_repository.list_paginated(db_session, q=str(fbf_project.id))
    misses = await submission_list_repository.list_paginated(db_session, q=str(fbf_project.id) + "0")

    assert [row.subject for row, _status in hits] == ["A"]
    assert misses == []


async def test_list_paginated_text_query_matches_subject(
    db_session: AsyncSession, app_profile: Profile, fbf_project: Project
) -> None:
    """A text query matches the subject via ILIKE."""
    await _submission(db_session, app_profile, fbf_project, subject="Data Architect")
    await _submission(db_session, app_profile, fbf_project, subject="Java Developer", is_current=False)

    rows = await submission_list_repository.list_paginated(db_session, q="architect")

    assert [row.subject for row, _status in rows] == ["Data Architect"]


async def test_list_paginated_respects_created_at_range(
    db_session: AsyncSession, app_profile: Profile, fbf_project: Project
) -> None:
    """The date filters bound the creation time inclusively."""
    await _submission(
        db_session, app_profile, fbf_project, subject="in", created_at=datetime(2026, 3, 15, 12, tzinfo=UTC)
    )
    await _submission(
        db_session,
        app_profile,
        fbf_project,
        subject="out",
        is_current=False,
        created_at=datetime(2026, 4, 1, tzinfo=UTC),
    )

    rows = await submission_list_repository.list_paginated(
        db_session, from_date=date(2026, 3, 15), to_date=date(2026, 3, 15)
    )

    assert [row.subject for row, _status in rows] == ["in"]


async def test_count_mirrors_the_list_filter(
    db_session: AsyncSession, app_profile: Profile, fbf_project: Project
) -> None:
    """The count equals the number of matching rows for the same filter."""
    await _submission(db_session, app_profile, fbf_project, subject="Data Architect")
    await _submission(db_session, app_profile, fbf_project, subject="Java Developer", is_current=False)

    assert await submission_list_repository.count(db_session, project_id=fbf_project.id) == 2
    assert await submission_list_repository.count(db_session, q="architect") == 1
