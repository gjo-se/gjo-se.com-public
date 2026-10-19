"""Integration tests for the ``endcustomer_snippet_filter`` activity (Act 4).

The relevance decision (keyword/skills fallback) and the ``rejected`` status
transition run against the real container database. No external call is
involved.
"""

from __future__ import annotations

from collections.abc import Callable
from unittest.mock import MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.activities import endcustomer_snippet_filter_activity
from app.fbf.models.project import Project
from app.fbf.repositories import (
    project_endcustomer_candidate_read_repository as candidate_read_repository,
)
from app.fbf.repositories import project_endcustomer_candidate_repository as candidate_repository
from app.shared.status.models.status import Statusable
from tests.reference_seed import ReferenceSeedData

pytestmark = pytest.mark.integration


class _TrackingSessionFactory:
    """Wrap the bound session factory and close every opened session afterwards.

    The activity reuses its Phase-1 session after the ``async with`` block closed
    it – a closed ``AsyncSession`` reopens a connection on the next use. That
    lingering session keeps an ACCESS SHARE lock that would deadlock the
    ``TRUNCATE`` teardown. Tracking and closing the sessions here keeps the run
    hermetic without touching application code.
    """

    def __init__(self, factory: Callable[[], AsyncSession]) -> None:
        self._factory = factory
        self._sessions: list[AsyncSession] = []

    def __call__(self) -> AsyncSession:
        """Return a new session from the wrapped factory and remember it."""
        session = self._factory()
        self._sessions.append(session)
        return session

    async def close_all(self) -> None:
        """Close every session handed out so their connections release their locks."""
        for session in self._sessions:
            await session.close()


async def _add_pending_candidate(
    db: AsyncSession,
    project_id: int,
    *,
    name: str,
    pending_status_id: int,
) -> int:
    """Persist a candidate and mark it ``pending`` via ``core_statusable``."""
    candidate = await candidate_repository.create(
        db,
        project_id=project_id,
        company_name=name,
        source="brave",
    )
    db.add(
        Statusable(
            status_id=pending_status_id,
            statusable_type="project_endcustomer_candidate",
            statusable_id=candidate.id,
        )
    )
    return candidate.id


async def test_run_rejects_keyword_mismatches_and_keeps_matches(
    reference_seed: ReferenceSeedData,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A candidate matching industry/city keyword stays pending; the others are rejected."""
    pending_status_id = reference_seed["project_endcustomer_candidate"]["pending"].id
    project = Project(
        url="https://example.test/projects/snippet-filter",
        title="Cloud Projekt",
        city="Berlin",
        industry="Cloud",
    )
    db_session.add(project)
    await db_session.flush()
    project_id = project.id
    kept_id = await _add_pending_candidate(
        db_session, project_id, name="Cloud Nine GmbH", pending_status_id=pending_status_id
    )
    rejected_id = await _add_pending_candidate(
        db_session, project_id, name="Unrelated Corp", pending_status_id=pending_status_id
    )
    await db_session.commit()

    tracker = _TrackingSessionFactory(endcustomer_snippet_filter_activity.GjoDB)
    monkeypatch.setattr(endcustomer_snippet_filter_activity, "GjoDB", tracker)

    result = await endcustomer_snippet_filter_activity.run(MagicMock(), {"project_id": project_id})
    await tracker.close_all()

    assert result == {"project_id": project_id, "rejected": 1, "kept": 1}

    db_session.expire_all()
    rows = await candidate_read_repository.get_by_project_rows(db_session, project_id)
    status_by_id = {row.candidate.id: row.status for row in rows}
    assert status_by_id[kept_id] == "pending"
    assert status_by_id[rejected_id] == "rejected"
