"""Integration tests for the ``endcustomer_page_fetch`` activity (Act 5).

The activity's public interface (``run``) runs against the real container
database; the career-page HTTP fetch goes exclusively through the deterministic
``mock_external_http`` respx routes. ``assert_all_mocked`` rejects any unmocked
request, so the run is hermetic – no real network call happens.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
import respx
from httpx import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.activities import endcustomer_page_fetch_activity
from app.fbf.models.project import Project
from app.fbf.repositories import project_endcustomer_candidate_repository as candidate_repository
from app.shared.status.models.status import Statusable
from tests.reference_seed import ReferenceSeedData

pytestmark = pytest.mark.integration

_REACHABLE_URL = "https://karriere.example.test/jobs"
_UNREACHABLE_URL = "https://gone.example.test/jobs"
_PAGE_TEXT = "Willkommen bei Beispielkunde – offene Stellen."


async def _add_pending_candidate(
    db: AsyncSession,
    project_id: int,
    *,
    name: str,
    career_page_url: str,
    pending_status_id: int,
) -> int:
    """Persist a candidate and mark it ``pending`` via ``core_statusable``."""
    candidate = await candidate_repository.create(
        db,
        project_id=project_id,
        company_name=name,
        source="brave",
        career_page_url=career_page_url,
    )
    db.add(
        Statusable(
            status_id=pending_status_id,
            statusable_type="project_endcustomer_candidate",
            statusable_id=candidate.id,
        )
    )
    return candidate.id


async def test_run_fetches_pending_pages_and_counts_failures(
    reference_seed: ReferenceSeedData,
    db_session: AsyncSession,
    mock_external_http: respx.Router,
) -> None:
    """A reachable page is fetched and stored; an unreachable one only counts as failure."""
    pending_status_id = reference_seed["project_endcustomer_candidate"]["pending"].id
    project = Project(url="https://example.test/projects/page-fetch", title="Page Fetch")
    db_session.add(project)
    await db_session.flush()
    project_id = project.id
    fetched_id = await _add_pending_candidate(
        db_session,
        project_id,
        name="Beispielkunde GmbH",
        career_page_url=_REACHABLE_URL,
        pending_status_id=pending_status_id,
    )
    failed_id = await _add_pending_candidate(
        db_session, project_id, name="Gone GmbH", career_page_url=_UNREACHABLE_URL, pending_status_id=pending_status_id
    )
    await db_session.commit()

    mock_external_http.get(_REACHABLE_URL).mock(return_value=Response(200, text=_PAGE_TEXT))
    mock_external_http.get(_UNREACHABLE_URL).mock(return_value=Response(404))

    result = await endcustomer_page_fetch_activity.run(MagicMock(), {"project_id": project_id})

    assert result == {"project_id": project_id, "fetched": 1, "failed": 1}

    db_session.expire_all()
    stored = {
        candidate.id: candidate for candidate in await candidate_repository.get_by_project(db_session, project_id)
    }
    assert stored[fetched_id].career_page_description == _PAGE_TEXT
    assert stored[failed_id].career_page_description is None
