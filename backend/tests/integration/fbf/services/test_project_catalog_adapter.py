"""Integration tests for ``project_catalog_adapter`` against the container DB.

Drives the real project-catalog port adapter through its public interface with a
live Postgres session – the persistence seam the application/crm contexts
consume. No external system is involved.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project import Project
from app.fbf.services.project_catalog_adapter import ProjectCatalogAdapter
from app.shared.status.models.status import Status
from app.shared.status.repositories import statusable_repository

pytestmark = pytest.mark.integration


async def test_get_project_returns_projected_facts(db_session: AsyncSession) -> None:
    """A persisted project is projected into ``ProjectRef`` with its facts."""
    project = Project(
        url="https://example.test/projects/catalog-ref",
        title="Data Engineer",
        title_normalized="Data Engineer",
        description="Remote Backend",
        remote_percent=100,
        contract_type="freelance",
        start_date="01/2026",
        country="DE",
        hourly_rate=90,
    )
    db_session.add(project)
    await db_session.flush()

    ref = await ProjectCatalogAdapter().get_project(db_session, project.id)

    assert ref is not None
    assert ref.id == project.id
    assert ref.title == "Data Engineer"
    assert ref.remote_percent == 100
    assert ref.contract_type == "freelance"
    assert ref.hourly_rate == 90
    assert ref.country == "DE"


async def test_get_project_returns_none_for_unknown_id(db_session: AsyncSession) -> None:
    """An id with no persisted project yields ``None``."""
    assert await ProjectCatalogAdapter().get_project(db_session, 999_999) is None


async def test_get_contact_facts_projects_company_contact_and_endcustomer(db_session: AsyncSession) -> None:
    """Only the contact-enrichment facts of the project are projected."""
    project = Project(
        url="https://example.test/projects/catalog-contact",
        title="Contact Projekt",
        company_name="ACME GmbH",
        contact_name="Jane Doe",
        endcustomer=True,
    )
    db_session.add(project)
    await db_session.flush()

    facts = await ProjectCatalogAdapter().get_contact_facts(db_session, project.id)

    assert facts is not None
    assert facts.company_name == "ACME GmbH"
    assert facts.contact_name == "Jane Doe"
    assert facts.endcustomer is True


async def test_get_titles_maps_known_ids_and_omits_unknown(db_session: AsyncSession) -> None:
    """The title projection covers known ids and drops unknown ones."""
    first = Project(url="https://example.test/projects/title-a", title="Projekt A", title_normalized="projekt-a")
    second = Project(url="https://example.test/projects/title-b", title="Projekt B")
    db_session.add_all([first, second])
    await db_session.flush()

    titles = await ProjectCatalogAdapter().get_titles(db_session, [first.id, second.id, 999_999])

    assert titles[first.id].title == "Projekt A"
    assert titles[first.id].title_normalized == "projekt-a"
    assert titles[second.id].title == "Projekt B"
    assert 999_999 not in titles


async def test_set_status_persists_exclusive_project_status(db_session: AsyncSession) -> None:
    """Setting a status writes the exclusive ``core_statusable`` row."""
    db_session.add(
        Status(
            name="favorite",
            slug="project-favorite",
            category="project",
            color_token="yellow",
            sort_order=2.0,
            scope=["project"],
        )
    )
    project = Project(url="https://example.test/projects/catalog-status", title="Status Projekt")
    db_session.add(project)
    await db_session.flush()
    project_id = project.id

    await ProjectCatalogAdapter().set_status(db_session, project_id, "favorite")

    entry = await statusable_repository.get_status(db_session, "project", project_id)
    assert entry is not None
    assert entry.status.name == "favorite"


async def test_project_title_select_projects_three_columns(db_session: AsyncSession) -> None:
    """The exposed selectable yields the ``(project_id, title, title_normalized)`` projection."""
    project = Project(
        url="https://example.test/projects/catalog-select",
        title="Select Projekt",
        title_normalized="select-projekt",
    )
    db_session.add(project)
    await db_session.flush()

    rows = (await db_session.execute(ProjectCatalogAdapter().project_title_select())).all()
    row = next(candidate for candidate in rows if candidate.project_id == project.id)

    assert row.title == "Select Projekt"
    assert row.title_normalized == "select-projekt"


async def test_get_freelancermap_external_id_none_for_unknown_url(db_session: AsyncSession) -> None:
    """A URL without a raw freelancermap entry yields ``None``."""
    external_id = await ProjectCatalogAdapter().get_freelancermap_external_id(
        db_session, "https://unknown.test/no-raw-entry"
    )

    assert external_id is None
