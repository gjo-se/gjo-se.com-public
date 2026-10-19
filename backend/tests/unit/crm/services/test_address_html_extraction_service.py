"""Unit tests for the address HTML-extraction helpers.

Covers the imprint-resolution orchestration (:func:`resolve_html_text`) and the
fetch-error path (:func:`fetch_url`) with a stubbed fetcher — no network, no DB.
Complementary to ``test_address_extraction_service`` (which covers the pure
text/link helpers).
"""

from __future__ import annotations

from typing import Any

import httpx
import pytest

from app.crm.services import address_html_extraction_service as html

pytestmark = pytest.mark.unit

_BASE_URL = "https://example.test"


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


async def test_resolve_html_text_prefers_imprint_link(monkeypatch: pytest.MonkeyPatch) -> None:
    """A detected imprint link is fetched and its text extracted."""
    calls: list[str] = []

    async def _fetch(url: str) -> str:
        calls.append(url)
        return "<p>Impressum: Musterstr 1</p>"

    monkeypatch.setattr(html, "fetch_url", _fetch)

    result = await html.resolve_html_text(_BASE_URL, '<a href="/impressum">Impressum</a>')

    assert result == "Impressum: Musterstr 1"
    assert calls == [f"{_BASE_URL}/impressum"]


async def test_resolve_html_text_uses_fallback_path_when_no_link(monkeypatch: pytest.MonkeyPatch) -> None:
    """Without a link on the page, the common imprint paths are tried."""

    async def _fetch(url: str) -> str | None:
        return "<p>Fallback-Impressum</p>" if url.endswith("/impressum") else None

    monkeypatch.setattr(html, "fetch_url", _fetch)

    result = await html.resolve_html_text(_BASE_URL, "<p>kein Link</p>")

    assert result == "Fallback-Impressum"


async def test_resolve_html_text_falls_back_to_main_page(monkeypatch: pytest.MonkeyPatch) -> None:
    """When no imprint is reachable, the main-page text is used."""

    async def _fetch(url: str) -> None:
        return None

    monkeypatch.setattr(html, "fetch_url", _fetch)

    result = await html.resolve_html_text(_BASE_URL, "<p>Hallo Welt</p>")

    assert result == "Hallo Welt"


async def test_fetch_url_returns_none_on_http_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """An HTTP error is swallowed and reported as ``None`` (no raise)."""

    class _FailingClient:
        async def __aenter__(self) -> _FailingClient:
            return self

        async def __aexit__(self, *_args: Any) -> bool:
            return False

        async def get(self, _url: str) -> httpx.Response:
            raise httpx.ConnectError("unreachable")

    monkeypatch.setattr(html.httpx, "AsyncClient", lambda **_kwargs: _FailingClient())

    assert await html.fetch_url(_BASE_URL) is None
