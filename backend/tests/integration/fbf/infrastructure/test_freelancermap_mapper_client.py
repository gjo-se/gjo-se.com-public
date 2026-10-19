"""Unit-Tests für FreelancermapMapperClient.

Testet:
- FreelancermapMapperClient.run() – Persistierung, Dedup, mapped_at-Filter
"""

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.infrastructure.freelancermap_mapper_client import FreelancermapMapperClient
from app.fbf.models.project import Project
from app.fbf.models.project_freelancer_map import ProjectFreelancerMap

pytestmark = pytest.mark.integration

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _create_raw_entry(
    db_session: AsyncSession,
    external_id: str = "EXT001",
    url: str = "https://www.freelancermap.de/project/1",
    title: str = "Python Developer gesucht",
    agency: str | None = "TestCorp GmbH",
    contact_name: str | None = "Max Muster",
    search_term_id: int | None = None,
    scraped_at: datetime | None = None,
) -> ProjectFreelancerMap:
    """Erstellt einen Test-ProjectFreelancerMap-Eintrag."""
    now = scraped_at or datetime.now(UTC)
    entry = ProjectFreelancerMap(
        external_id=external_id,
        url=url,
        title=title,
        agency=agency,
        contact_name=contact_name,
        search_term_id=search_term_id,
        posted_at=now,
        scraped_at=now,
    )
    db_session.add(entry)
    await db_session.commit()
    await db_session.refresh(entry)
    return entry


# ---------------------------------------------------------------------------
# FreelancermapMapperClient.run() – Persistierung
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@pytest.mark.xdist_group("db")
async def test_mapper_run_persists_project(gjo_se_db_session: AsyncSession) -> None:
    """Neuer ProjectFreelancerMap-Eintrag -> Project persistiert, Contact verknüpft."""
    await _create_raw_entry(gjo_se_db_session, external_id="EXT001", url="https://www.freelancermap.de/p/1")

    mapper = FreelancermapMapperClient()
    saved = await mapper.run(gjo_se_db_session)

    assert saved["new_projects"] == 1

    result = await gjo_se_db_session.execute(select(Project).where(Project.url == "https://www.freelancermap.de/p/1"))
    projects = result.scalars().all()
    assert len(projects) == 1
    assert projects[0].url == "https://www.freelancermap.de/p/1"


@pytest.mark.asyncio
@pytest.mark.xdist_group("db")
async def test_mapper_run_skips_duplicate_url(gjo_se_db_session: AsyncSession) -> None:
    """Doppelte URL -> Eintrag übersprungen, kein IntegrityError, Rückgabewert 0."""
    await _create_raw_entry(gjo_se_db_session, external_id="EXT003", url="https://www.freelancermap.de/p/3")

    mapper = FreelancermapMapperClient()
    first = await mapper.run(gjo_se_db_session)

    assert first["new_projects"] == 1

    mapper = FreelancermapMapperClient()
    second = await mapper.run(gjo_se_db_session)

    assert second["new_projects"] == 0


@pytest.mark.asyncio
@pytest.mark.xdist_group("db")
async def test_mapper_run_skips_already_mapped_entry(
    gjo_se_db_session: AsyncSession,
) -> None:
    """Eintrag mit gesetztem mapped_at wird übersprungen – kein erneutes Mapping."""
    already_mapped_time = datetime.now(UTC) - timedelta(hours=1)

    await _create_raw_entry(
        gjo_se_db_session,
        external_id="EXT_MAPPED",
        url="https://www.freelancermap.de/p/already-mapped",
    )
    await _create_raw_entry(
        gjo_se_db_session,
        external_id="EXT_NEW",
        url="https://www.freelancermap.de/p/unmapped",
    )

    await gjo_se_db_session.execute(
        update(ProjectFreelancerMap)
        .where(ProjectFreelancerMap.external_id == "EXT_MAPPED")
        .values(mapped_at=already_mapped_time)
    )
    await gjo_se_db_session.commit()

    mapper = FreelancermapMapperClient()
    saved = await mapper.run(gjo_se_db_session)

    assert saved["new_projects"] == 1

    result = await gjo_se_db_session.execute(
        select(Project).where(Project.url == "https://www.freelancermap.de/p/already-mapped")
    )
    assert result.scalar_one_or_none() is None

    result2 = await gjo_se_db_session.execute(
        select(Project).where(Project.url == "https://www.freelancermap.de/p/unmapped")
    )
    assert result2.scalar_one_or_none() is not None
