"""Integration tests for the endcustomer-candidate read-model projection.

Verifies the core-status projection against the real (container) database:
``get_by_project_rows`` resolves the candidate status from ``core_statusable``.
Public interface only.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project import Project
from app.fbf.repositories import project_endcustomer_candidate_read_repository, project_endcustomer_candidate_repository
from app.shared.status.models.status import Statusable
from tests.reference_seed import ReferenceSeedData

pytestmark = pytest.mark.integration


def _project(url_suffix: str) -> Project:
    """Build a minimal project FK target."""
    return Project(url=f"https://example.test/projects/{url_suffix}", title=f"Projekt {url_suffix}")


async def test_get_by_project_rows_projects_core_status(
    reference_seed: ReferenceSeedData,
    db_session: AsyncSession,
) -> None:
    """The read-model exposes the status resolved via core_statusable."""
    pending = reference_seed["project_endcustomer_candidate"]["pending"]
    project = _project("cand-read-status")
    db_session.add(project)
    await db_session.flush()
    candidate = await project_endcustomer_candidate_repository.create(
        db_session, project_id=project.id, company_name="Status AG", source="both", confidence=0.5
    )
    db_session.add(
        Statusable(
            status_id=pending.id,
            statusable_type="project_endcustomer_candidate",
            statusable_id=candidate.id,
        )
    )
    await db_session.flush()

    rows = await project_endcustomer_candidate_read_repository.get_by_project_rows(db_session, project.id)

    assert rows[0].candidate.id == candidate.id
    assert rows[0].status == "pending"
