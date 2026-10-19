"""Integration tests for the isolated Fargate scraper job entrypoint.

``run_scraper_job._main`` bootstraps the app, resolves the scraper collaborators
through the fbf composition root and maps the canonical scraper run to a process
exit code. The credential lookup and the archive sweep run against the real
(container) database; the scraper and mapper are deterministic doubles, so no
portal, LLM or network call leaves the process.
"""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from typing import cast

import pytest
import respx
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.dependencies import fbf_dependencies
from app.fbf.jobs.run_scraper_job import _main
from app.fbf.services import unified_scraper_service
from app.fbf.services.freelancermap_scraping_service import FreelancermapScrapingService
from app.shared.credential_store.dependencies.credential_store_dependencies import (
    get_admin_credential_service,
)
from app.shared.credential_store.schemas.admin_credential_schemas import AdminCredentialUpsertIn

pytestmark = pytest.mark.integration


class _StubScraper:
    """Scraper double recording the credentials it was handed – performs no I/O."""

    def __init__(self) -> None:
        """Initialise the credential recorder."""
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
        """Store the fixed number of new projects the double reports."""
        self.runs = 0
        self._new_projects = new_projects

    async def run(self, _db: AsyncSession) -> dict[str, int]:
        """Return fixed mapper stats without touching the database."""
        self.runs += 1
        return {"new_projects": self._new_projects}


def _scraper_factory(scraper: _StubScraper) -> Callable[[AsyncSession], FreelancermapScrapingService]:
    """Return a session-bound factory yielding the given scraper double."""
    return lambda _db: cast("FreelancermapScrapingService", scraper)


async def _seed_freelancermap_credentials(db: AsyncSession, username: str, password: str) -> None:
    """Persist encrypted freelancermap login credentials on the real database."""
    await get_admin_credential_service().upsert(
        db,
        service="freelancermap",
        source_type="integration",
        body=AdminCredentialUpsertIn(login_username=username, login_password=password),
    )


async def test_main_runs_the_canonical_scraper_against_the_container_db(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    mock_external_http: respx.Router,
) -> None:
    """A seeded portal drives a real DB-backed run that maps to exit code 0."""
    monkeypatch.setenv("SCRAPER_STATUS_FILE", str(tmp_path / "scraper-status.json"))
    await _seed_freelancermap_credentials(db_session, "stub-user", "stub-pass")
    scraper = _StubScraper()
    mapper = _StubMapper(new_projects=3)
    monkeypatch.setattr(fbf_dependencies, "get_freelancermap_scraping_service", _scraper_factory(scraper))
    monkeypatch.setattr(fbf_dependencies, "get_freelancermap_mapper_client", lambda *_args, **_kwargs: mapper)

    exit_code = await _main()

    assert exit_code == 0
    assert scraper.credentials == [("stub-user", "stub-pass")]
    assert mapper.runs == 1


async def test_main_returns_failure_exit_code_when_run_does_not_complete(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A run that reports a non-done status maps to exit code 1."""

    async def _incomplete(**_kwargs: object) -> dict[str, object]:
        return {"status": "aborted"}

    monkeypatch.setattr(unified_scraper_service, "run_unified_scraper", _incomplete)

    assert await _main() == 1


async def test_main_returns_failure_exit_code_when_run_raises(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """An exception inside the canonical run is caught and mapped to exit code 1."""

    async def _boom(**_kwargs: object) -> dict[str, object]:
        raise RuntimeError("scraper exploded")

    monkeypatch.setattr(unified_scraper_service, "run_unified_scraper", _boom)

    assert await _main() == 1
