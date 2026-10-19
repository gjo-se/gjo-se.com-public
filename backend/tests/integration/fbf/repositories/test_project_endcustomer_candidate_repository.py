"""Integration tests for ``project_endcustomer_candidate_repository``.

Verifies the endcustomer-candidate seam against the real (container) database:
create + project-scoped reads, core-status projection, status/field updates.
Public interface only.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project import Project
from app.fbf.repositories import (
    project_endcustomer_candidate_read_repository,
    project_endcustomer_candidate_repository,
)
from app.shared.status.models.status import Statusable
from tests.reference_seed import ReferenceSeedData

pytestmark = pytest.mark.integration


def _project(url_suffix: str) -> Project:
    """Build a minimal project FK target."""
    return Project(url=f"https://example.test/projects/{url_suffix}", title=f"Projekt {url_suffix}")


async def test_create_persists_candidate_retrievable_by_project(db_session: AsyncSession) -> None:
    """A created candidate is returned by the project-scoped lookup."""
    project = _project("cand-create")
    db_session.add(project)
    await db_session.flush()

    created = await project_endcustomer_candidate_repository.create(
        db_session,
        project_id=project.id,
        company_name="ACME GmbH",
        source="brave",
        confidence=0.8,
        website="https://acme.test",
    )
    rows = await project_endcustomer_candidate_repository.get_by_project(db_session, project.id)

    assert created.id is not None
    assert [row.company_name for row in rows] == ["ACME GmbH"]


async def test_get_by_project_scopes_to_given_project(db_session: AsyncSession) -> None:
    """Candidates of another project are never returned."""
    first = _project("cand-first")
    second = _project("cand-second")
    db_session.add_all([first, second])
    await db_session.flush()
    await project_endcustomer_candidate_repository.create(
        db_session, project_id=first.id, company_name="First AG", source="tavily"
    )
    await project_endcustomer_candidate_repository.create(
        db_session, project_id=second.id, company_name="Second AG", source="tavily"
    )

    rows = await project_endcustomer_candidate_repository.get_by_project(db_session, first.id)

    assert [row.company_name for row in rows] == ["First AG"]


async def test_get_by_project_rows_projects_core_status(
    reference_seed: ReferenceSeedData,
    db_session: AsyncSession,
) -> None:
    """The read-model exposes the status resolved via core_statusable."""
    pending = reference_seed["project_endcustomer_candidate"]["pending"]
    project = _project("cand-status")
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

    assert len(rows) == 1
    assert rows[0].status == "pending"
    assert rows[0].status_color_token == "amber"


async def test_update_status_transitions_candidate(
    reference_seed: ReferenceSeedData,
    db_session: AsyncSession,
) -> None:
    """update_status persists the new core status and returns None for a missing id."""
    project = _project("cand-update")
    db_session.add(project)
    await db_session.flush()
    candidate = await project_endcustomer_candidate_repository.create(
        db_session, project_id=project.id, company_name="Update AG", source="brave"
    )

    updated = await project_endcustomer_candidate_repository.update_status(db_session, candidate.id, "accepted")
    rows = await project_endcustomer_candidate_read_repository.get_by_project_rows(db_session, project.id)

    assert updated is not None
    assert rows[0].status == "accepted"
    assert rows[0].status_color_token == "green"
    assert await project_endcustomer_candidate_repository.update_status(db_session, 999_999, "accepted") is None


async def test_update_fields_updates_and_returns_none_for_missing(db_session: AsyncSession) -> None:
    """update_fields applies the field values and reports None for a missing id."""
    project = _project("cand-fields")
    db_session.add(project)
    await db_session.flush()
    candidate = await project_endcustomer_candidate_repository.create(
        db_session, project_id=project.id, company_name="Fields AG", source="brave", confidence=0.3
    )

    updated = await project_endcustomer_candidate_repository.update_fields(db_session, candidate.id, confidence=0.95)

    assert updated is not None
    assert updated.confidence == 0.95
    assert await project_endcustomer_candidate_repository.update_fields(db_session, 999_999, confidence=0.1) is None


async def test_get_latest_by_project_returns_only_latest_run(db_session: AsyncSession) -> None:
    """Candidates older than the latest run are excluded from the latest lookup."""
    project = _project("cand-latest")
    db_session.add(project)
    await db_session.flush()
    stale = await project_endcustomer_candidate_repository.create(
        db_session, project_id=project.id, company_name="Stale AG", source="brave"
    )
    fresh = await project_endcustomer_candidate_repository.create(
        db_session, project_id=project.id, company_name="Fresh AG", source="brave"
    )
    await project_endcustomer_candidate_repository.update_fields(
        db_session, stale.id, created_at=datetime(2020, 1, 1, tzinfo=UTC)
    )

    rows = await project_endcustomer_candidate_repository.get_latest_by_project(db_session, project.id)

    assert [row[0].company_name for row in rows] == [fresh.company_name]
