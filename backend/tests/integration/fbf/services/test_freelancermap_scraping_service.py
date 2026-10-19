"""Integration test for the freelancermap scraping seam (external HTTP stubbed).

Reference seam for Increment 6 (Schritt 4): it proves the deterministic stub
pattern end-to-end. The service reaches the portal exclusively through the
``mock_external_http`` respx routes (``assert_all_mocked`` rejects any unmocked
request), the clock is frozen via ``frozen_time`` and the parsed result lands in
the real container database (``db_session``). No real network call happens.
"""

from __future__ import annotations

from collections.abc import Callable
from contextlib import AbstractContextManager
from datetime import UTC, datetime
from typing import Any

import httpx
import pytest
import respx
from httpx import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.search_term import SearchTerm
from app.fbf.repositories import project_freelancer_map_repository
from app.fbf.services.freelancermap_scraping_service import FreelancermapScrapingService
from app.shared.status.models.status import Status, Statusable

pytestmark = [pytest.mark.integration, pytest.mark.xdist_group("db")]

#: Deterministic frozen instant (also the expected ``scraped_at``).
_FROZEN_NOW = datetime(2026, 5, 1, 9, 30, tzinfo=UTC)

#: respx route patterns for the two external portals URLs the seam touches.
_SEARCH_URL_RE = r"https://www\.freelancermap\.de/projekte.*"
_AJAX_URL_RE = r"https://www\.freelancermap\.de/project/search/ajax.*"

#: Full URL the service derives from ``links.project`` – the persistence key.
_PROJECT_URL = "https://www.freelancermap.de/projekt/stub-data-engineer"

#: One raw project as the AJAX endpoint would return it (all parsed fields set).
_STUB_PROJECTS: list[dict[str, Any]] = [
    {
        "id": 987654,
        "links": {"project": "/projekt/stub-data-engineer"},
        "created": "2026-04-21T11:40:17+02:00",
        "title": "Stub Data Engineer",
        "description": "<p>Build <strong>pipelines</strong></p>",
        "company": "Beispielkunde GmbH",
        "firstName": "Erika",
        "lastName": "Mustermann",
        "city": " Berlin ",
        "country": {"nameDe": "Deutschland"},
        "projectContractType": {"remoteInPercent": 80, "type": "Contracting"},
        "duration": 6,
        "beginningMonth": 5,
        "beginningYear": 2026,
        "skills": [{"en": "Python"}, {"en": "SQL"}, {"en": "Python"}],
        "industry": {"nameDe": "IT"},
        "verlaengerung": 1,
        "endcustomer": 0,
    },
]

#: Deterministic AJAX response body registered on the respx router.
_AJAX_PAYLOAD: dict[str, Any] = {"count": len(_STUB_PROJECTS), "projects": _STUB_PROJECTS}


class _StubPage:
    """Minimal stand-in for a Playwright page – only ``close`` is exercised."""

    async def close(self) -> None:
        """Release the fake page – nothing to release."""
        return


class _StubBrowser:
    """PlaywrightClient double that routes its HTTP through ``httpx``.

    Keeps the real client's public surface (``get_page``/``fetch_json`` as an
    async context manager) but sends every request through ``httpx`` so the
    ``mock_external_http`` respx router intercepts it. With
    ``assert_all_mocked`` any request the stub did not register raises instead of
    reaching the real portal – the guard that proves the run is hermetic.
    """

    def __init__(self) -> None:
        self._client = httpx.AsyncClient()

    async def __aenter__(self) -> _StubBrowser:
        return self

    async def __aexit__(self, *_exc: object) -> None:
        await self._client.aclose()

    async def get_page(self, url: str) -> _StubPage:
        """Load the session-init page (no DOM parsing happens downstream)."""
        response = await self._client.get(url)
        response.raise_for_status()
        return _StubPage()

    async def fetch_json(self, url: str) -> object:
        """Fetch and decode the AJAX JSON payload."""
        response = await self._client.get(url)
        response.raise_for_status()
        return response.json()


def _browser_factory(_storage_state: str | None) -> _StubBrowser:
    """Return a fresh stub browser for a scraping run."""
    return _StubBrowser()


async def _seed_active_search_term(db: AsyncSession, name: str) -> SearchTerm:
    """Create a SearchTerm and mark it ``active`` via ``core_statusable``."""
    term = SearchTerm(name=name)
    db.add(term)
    await db.flush()
    active = Status(name="active", slug="test-fbf-scraping-active", category="fbf", color_token="green")
    db.add(active)
    await db.flush()
    db.add(Statusable(status_id=active.id, statusable_type="fbf_search_term", statusable_id=term.id))
    await db.commit()
    await db.refresh(term)
    return term


async def test_scraping_seam_persists_stubbed_ajax_result(
    db_session: AsyncSession,
    mock_external_http: respx.Router,
    frozen_time: Callable[[datetime], AbstractContextManager[None]],
) -> None:
    """The seam persists the parsed AJAX result while HTTP stays fully stubbed."""
    term = await _seed_active_search_term(db_session, "Stub Suchbegriff")

    _ = mock_external_http.get(url__regex=_SEARCH_URL_RE).mock(return_value=Response(200, text="<html></html>"))
    ajax_route = mock_external_http.get(url__regex=_AJAX_URL_RE).mock(return_value=Response(200, json=_AJAX_PAYLOAD))

    service = FreelancermapScrapingService(db=db_session, browser_factory=_browser_factory)
    with frozen_time(_FROZEN_NOW):
        saved = await service.run(username="", password="")

    assert saved == len(_STUB_PROJECTS)
    assert ajax_route.called

    stored = await project_freelancer_map_repository.get_by_url(db_session, _PROJECT_URL)
    assert stored is not None
    assert stored.external_id == "987654"
    assert stored.title == "Stub Data Engineer"
    assert stored.search_term_id == term.id
    assert stored.description is not None and "**pipelines**" in stored.description
    assert stored.agency == "Beispielkunde GmbH"
    assert stored.contact_name == "Erika Mustermann"
    assert stored.city == "Berlin"
    assert stored.country == "Deutschland"
    assert stored.remote_percent == 80
    assert stored.contract_type == "Contracting"
    assert stored.duration == 6
    assert stored.start_date == "5/2026"
    assert stored.industry == "IT"
    assert stored.extension_possible is True
    assert stored.endcustomer is False
    assert stored.skills == ["Python", "SQL"]
    assert stored.posted_at == datetime.fromisoformat("2026-04-21T11:40:17+02:00")
    assert stored.scraped_at == _FROZEN_NOW
