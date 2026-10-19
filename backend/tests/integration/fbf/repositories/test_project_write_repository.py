"""Integration tests for ``project_write_repository`` (single-field writers).

Verifies the shared ``_set_project_field`` core and the individual ``set_*``
writers persist against the real (container) database and return ``None`` for an
unknown project. Public interface only.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project import Project
from app.fbf.repositories import project_write_repository

pytestmark = pytest.mark.integration


def _project(url_suffix: str) -> Project:
    """Build a minimal project entity (helper keeps the arrange blocks compact)."""
    return Project(url=f"https://example.test/write/{url_suffix}", title=f"Write {url_suffix}")


async def test_set_notes_persists_value(db_session: AsyncSession) -> None:
    """The notes writer persists the value and returns the updated project."""
    project = _project("notes")
    db_session.add(project)
    await db_session.flush()

    updated = await project_write_repository.set_notes(db_session, project.id, "hello")

    assert updated is not None
    assert updated.notes == "hello"


async def test_set_hourly_rate_persists_value(db_session: AsyncSession) -> None:
    """The hourly-rate writer persists the estimated upper bound."""
    project = _project("rate")
    db_session.add(project)
    await db_session.flush()

    updated = await project_write_repository.set_hourly_rate(db_session, project.id, 85)

    assert updated is not None
    assert updated.hourly_rate == 85


async def test_set_my_start_date_persists_override(db_session: AsyncSession) -> None:
    """The manual-start writer persists the override."""
    project = _project("start")
    db_session.add(project)
    await db_session.flush()

    updated = await project_write_repository.set_my_start_date(db_session, project.id, "01/2026")

    assert updated is not None
    assert updated.my_start_date == "01/2026"


async def test_missing_project_returns_none(db_session: AsyncSession) -> None:
    """An unknown project id yields ``None`` and writes nothing."""
    assert await project_write_repository.set_title_normalized(db_session, 999_999, "T") is None
