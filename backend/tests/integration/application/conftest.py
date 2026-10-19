"""Shared fixtures for the ``application`` integration tests.

The suite-wide ``db_session`` fixture provides a real (testcontainers) Postgres
session with the full schema. These fixtures add the minimal rows an application
repository/service needs: the singleton profile, an fbf project and a submission
that links both. ``db_session`` truncates all tables after each test, so the
fixtures are function-scoped and isolated.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.models.profile import Profile
from app.application.models.submission import Submission
from app.fbf.models.project import Project
from app.shared.status.models.status import Status


@pytest.fixture()
async def app_profile(db_session: AsyncSession) -> Profile:
    """Persist the singleton application profile and return it."""
    profile = Profile(full_name="Test Person", email="person@example.test")
    db_session.add(profile)
    await db_session.flush()
    return profile


@pytest.fixture()
async def fbf_project(db_session: AsyncSession) -> Project:
    """Persist an fbf project (FK target) and return it."""
    project = Project(url="https://example.test/projects/1", title="Testprojekt")
    db_session.add(project)
    await db_session.flush()
    return project


@pytest.fixture()
async def app_submission(
    db_session: AsyncSession,
    app_profile: Profile,
    fbf_project: Project,
) -> Submission:
    """Persist a submission linking the profile and the project."""
    submission = Submission(
        project_id=fbf_project.id,
        sender_profile_id=app_profile.id,
        subject="Bewerbung Testprojekt",
        body="Guten Tag, hiermit bewerbe ich mich.",
        language="de",
        sender_email="person@example.test",
        recipient_email="hr@example-kunde.test",
    )
    db_session.add(submission)
    await db_session.flush()
    return submission


@pytest.fixture()
async def active_status(db_session: AsyncSession) -> Status:
    """Persist an ``active`` status used by the ``active_only`` filters."""
    status = Status(name="active", slug="test-active", category="application", color_token="green")
    db_session.add(status)
    await db_session.flush()
    return status
