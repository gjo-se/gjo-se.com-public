"""Integration tests for ``unified_scraper_service`` against the container DB.

``run_unified_scraper`` orchestrates the credential-store lookup (real Postgres
through the container-bound session factory), the injected scraper/mapper and
the auto-archive sweep. The scraper and mapper are deterministic doubles – no
portal or LLM call happens – while the credential seam and the archive sweep run
against the real database. Public interface only.
"""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from typing import cast

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.infrastructure.freelancermap_mapper_client import FreelancermapMapperClient
from app.fbf.services.freelancermap_scraping_service import FreelancermapScrapingService
from app.fbf.services.unified_scraper_service import run_unified_scraper
from app.shared.credential_store.dependencies.credential_store_dependencies import (
    get_admin_credential_service,
)
from app.shared.credential_store.schemas.admin_credential_schemas import AdminCredentialUpsertIn

pytestmark = [pytest.mark.integration, pytest.mark.xdist_group("db")]


class _StubScraper:
    """Scraper double recording the credentials it was handed – performs no I/O."""

    def __init__(self) -> None:
        self.credentials: list[tuple[str | None, str | None]] = []

    async def run(
        self,
        max_results: int | None = None,
        force_full: bool = False,
        force_login: bool = False,
        username: str | None = None,
        password: str | None = None,
        since_days: int | None = None,
    ) -> int:
        """Record the run call and report zero scraped rows."""
        self.credentials.append((username, password))
        return 0


class _StubMapper:
    """Mapper double returning deterministic stats – performs no I/O."""

    def __init__(self, new_projects: int) -> None:
        self.runs = 0
        self._new_projects = new_projects

    async def run(self, _db: AsyncSession) -> dict[str, int | float]:
        """Return fixed mapper stats without touching the database."""
        self.runs += 1
        return {"new_projects": self._new_projects}


async def _seed_freelancermap_credentials(db: AsyncSession, username: str, password: str) -> None:
    """Persist encrypted freelancermap login credentials on the real database."""
    await get_admin_credential_service().upsert(
        db,
        service="freelancermap",
        source_type="integration",
        body=AdminCredentialUpsertIn(login_username=username, login_password=password),
    )


def _scraper_factory(scraper: _StubScraper) -> Callable[[AsyncSession], FreelancermapScrapingService]:
    """Return a session-bound factory yielding the given scraper double."""
    return lambda _db: cast("FreelancermapScrapingService", scraper)


async def test_run_unified_scraper_skips_when_portal_lacks_credentials(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """A seeded portal without stored credentials skips before any scraping."""
    monkeypatch.setenv("SCRAPER_STATUS_FILE", str(tmp_path / "scraper-status.json"))
    scraper = _StubScraper()
    mapper = _StubMapper(new_projects=0)

    result = await run_unified_scraper(
        scraper_factory=_scraper_factory(scraper),
        mapper=cast("FreelancermapMapperClient", mapper),
    )

    assert result == {
        "status": "done",
        "saved": 0,
        "skipped": ["freelancermap"],
        "reason": "no_credentials",
    }
    assert scraper.credentials == []
    assert mapper.runs == 0


async def test_run_unified_scraper_orchestrates_scrape_map_and_archive(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """Stored credentials drive a full run: scrape, map and report the stats."""
    monkeypatch.setenv("SCRAPER_STATUS_FILE", str(tmp_path / "scraper-status.json"))
    await _seed_freelancermap_credentials(db_session, "stub-user", "stub-pass")
    scraper = _StubScraper()
    mapper = _StubMapper(new_projects=3)

    result = await run_unified_scraper(
        scraper_factory=_scraper_factory(scraper),
        mapper=cast("FreelancermapMapperClient", mapper),
    )

    assert result["status"] == "done"
    assert result["saved"] == 3
    assert result["stats"] == {"new_projects": 3}
    assert scraper.credentials == [("stub-user", "stub-pass")]
    assert mapper.runs == 1
