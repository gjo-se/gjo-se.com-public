"""Integration-Tests fuer ProjectFreelancerMap ORM-Model."""

from datetime import UTC, datetime

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project_freelancer_map import ProjectFreelancerMap

pytestmark = pytest.mark.integration

_NOW = datetime(2026, 1, 1, 0, 0, 0, tzinfo=UTC)


@pytest.mark.asyncio
@pytest.mark.xdist_group("db")
async def test_project_freelancer_map_create_and_read(
    gjo_se_db_session: AsyncSession,
) -> None:
    """ProjectFreelancerMap anlegen und lesen – Pflichtfelder vorhanden."""
    entry = ProjectFreelancerMap(
        external_id="FM-001",
        url="https://www.freelancermap.de/project/1",
        title="AI Engineer gesucht",
        posted_at=_NOW,
        scraped_at=_NOW,
    )
    gjo_se_db_session.add(entry)
    await gjo_se_db_session.commit()
    await gjo_se_db_session.refresh(entry)

    loaded = await gjo_se_db_session.get(ProjectFreelancerMap, entry.id)
    assert loaded is not None
    assert loaded.external_id == "FM-001"
    assert loaded.url == "https://www.freelancermap.de/project/1"
    assert loaded.title == "AI Engineer gesucht"
    assert loaded.mapped_at is None


@pytest.mark.asyncio
@pytest.mark.xdist_group("db")
async def test_project_freelancer_map_external_id_unique_raises_integrity_error(
    gjo_se_db_session: AsyncSession,
) -> None:
    """Doppelte external_id → IntegrityError."""
    gjo_se_db_session.add(
        ProjectFreelancerMap(
            external_id="FM-DUPE",
            url="https://freelancermap.de/p/1",
            title="Project A",
            posted_at=_NOW,
            scraped_at=_NOW,
        )
    )
    await gjo_se_db_session.commit()

    gjo_se_db_session.add(
        ProjectFreelancerMap(
            external_id="FM-DUPE",
            url="https://freelancermap.de/p/2",
            title="Project B",
            posted_at=_NOW,
            scraped_at=_NOW,
        )
    )
    with pytest.raises(IntegrityError):
        await gjo_se_db_session.commit()


@pytest.mark.asyncio
@pytest.mark.xdist_group("db")
async def test_project_freelancer_map_url_unique_raises_integrity_error(
    gjo_se_db_session: AsyncSession,
) -> None:
    """Doppelte url → IntegrityError."""
    gjo_se_db_session.add(
        ProjectFreelancerMap(
            external_id="FM-URL-1",
            url="https://freelancermap.de/shared-url",
            title="Project X",
            posted_at=_NOW,
            scraped_at=_NOW,
        )
    )
    await gjo_se_db_session.commit()

    gjo_se_db_session.add(
        ProjectFreelancerMap(
            external_id="FM-URL-2",
            url="https://freelancermap.de/shared-url",
            title="Project Y",
            posted_at=_NOW,
            scraped_at=_NOW,
        )
    )
    with pytest.raises(IntegrityError):
        await gjo_se_db_session.commit()
