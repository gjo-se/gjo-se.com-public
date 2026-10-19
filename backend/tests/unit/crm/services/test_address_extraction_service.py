"""Unit tests for the pure HTML helpers of the address-extraction service.

Covers imprint-link detection (keyword match, relative → absolute resolution,
non-imprint exclusion) and visible-text extraction (script/style stripping,
whitespace collapse, empty input, length cap). No DB and no HTTP.
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from app.crm.services import address_extraction_service as svc
from app.crm.services.address_extraction_service import (
    MAX_HTML_TEXT_LENGTH,
    AddressExtractionResult,
    _extract_text,
    _find_imprint_link,
    _resolve_base_url,
    _run_extraction,
    _upsert_extracted_address,
    extract_address_from_website,
)

pytestmark = pytest.mark.unit

_BASE_URL = "https://example.test"


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


def test_find_imprint_link_resolves_relative_href_to_absolute_url() -> None:
    """A relative imprint href is resolved against the base URL."""
    html = '<a href="/impressum">Impressum</a>'

    result = _find_imprint_link(html, _BASE_URL)

    assert result == "https://example.test/impressum"


def test_find_imprint_link_detects_keyword_in_link_text() -> None:
    """The keyword is matched in the anchor text as well as the href."""
    html = '<a href="/page?id=7">Imprint</a>'

    result = _find_imprint_link(html, _BASE_URL)

    assert result == "https://example.test/page?id=7"


def test_find_imprint_link_returns_none_when_no_imprint_present() -> None:
    """A page without any imprint keyword yields no link."""
    html = '<a href="/about">About us</a><a href="/kontakt">Kontakt</a>'

    result = _find_imprint_link(html, _BASE_URL)

    assert result is None


def test_find_imprint_link_ignores_generic_legal_terms_link() -> None:
    """A generic ``legal``/AGB link is not treated as an imprint."""
    html = '<a href="/agb">Allgemeine Geschaeftsbedingungen</a>'

    result = _find_imprint_link(html, _BASE_URL)

    assert result is None


def test_extract_text_strips_scripts_styles_and_markup() -> None:
    """Script/style content and remaining tags are removed, whitespace collapsed."""
    html = "<style>.x{color:red}</style><script>secret()</script><p>Hallo   Welt</p>"

    result = _extract_text(html)

    assert result == "Hallo Welt"


def test_extract_text_returns_none_for_markup_only_input() -> None:
    """Input without any visible text yields ``None``."""
    result = _extract_text("<div></div>   ")

    assert result is None


def test_extract_text_truncates_to_configured_max_length() -> None:
    """Extracted text never exceeds ``MAX_HTML_TEXT_LENGTH`` characters."""
    html = "<p>" + ("a" * (MAX_HTML_TEXT_LENGTH + 500)) + "</p>"

    result = _extract_text(html)

    assert result is not None
    assert len(result) == MAX_HTML_TEXT_LENGTH


# ── _resolve_base_url ────────────────────────────────────────────────────────


def test_resolve_base_url_adds_https_when_scheme_missing() -> None:
    assert _resolve_base_url("example.test") == "https://example.test"


def test_resolve_base_url_keeps_existing_scheme_and_strips_whitespace() -> None:
    assert _resolve_base_url("  http://example.test  ") == "http://example.test"
    assert _resolve_base_url("https://example.test") == "https://example.test"


# ── extract_address_from_website (orchestration, fakes) ─────────────────────


def _company(website: str | None) -> SimpleNamespace:
    return SimpleNamespace(id=11, website=website)


@pytest.mark.asyncio
async def test_extract_address_without_website_returns_none() -> None:
    assert await extract_address_from_website(object(), object(), _company(None)) is None


@pytest.mark.asyncio
async def test_extract_address_returns_none_when_main_page_unreachable(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _fetch(_url: str) -> None:
        return None

    monkeypatch.setattr(svc, "fetch_url", _fetch)
    assert await extract_address_from_website(object(), object(), _company("example.test")) is None


@pytest.mark.asyncio
async def test_extract_address_returns_none_without_html_text(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _fetch(_url: str) -> str:
        return "<html></html>"

    async def _text(_base: str, _html: str) -> str:
        return ""

    monkeypatch.setattr(svc, "fetch_url", _fetch)
    monkeypatch.setattr(svc, "resolve_html_text", _text)
    assert await extract_address_from_website(object(), object(), _company("example.test")) is None


@pytest.mark.asyncio
async def test_extract_address_returns_none_when_llm_yields_nothing(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _fetch(_url: str) -> str:
        return "<html>text</html>"

    async def _text(_base: str, _html: str) -> str:
        return "text"

    class _Executor:
        async def execute_task(self, **_kwargs: Any) -> dict[str, Any]:
            return {"success": True, "result": AddressExtractionResult()}

    monkeypatch.setattr(svc, "fetch_url", _fetch)
    monkeypatch.setattr(svc, "resolve_html_text", _text)
    monkeypatch.setattr(svc, "get_task_executor_service", _Executor)

    assert await extract_address_from_website(object(), object(), _company("example.test")) is None


@pytest.mark.asyncio
async def test_extract_address_success_delegates_to_upsert(monkeypatch: pytest.MonkeyPatch) -> None:
    result = AddressExtractionResult(street="Weg 1", city="Stadt")
    created: list[Any] = []

    async def _fetch(_url: str) -> str:
        return "<html>text</html>"

    async def _text(_base: str, _html: str) -> str:
        return "text"

    class _Executor:
        async def execute_task(self, **_kwargs: Any) -> dict[str, Any]:
            return {"success": True, "result": result}

    async def _list(_db: Any, _cid: int) -> list[Any]:
        return []

    async def _create(_db: Any, payload: Any) -> Any:
        created.append(payload)
        return SimpleNamespace(street=payload.street, zip=payload.zip, city=payload.city)

    monkeypatch.setattr(svc, "fetch_url", _fetch)
    monkeypatch.setattr(svc, "resolve_html_text", _text)
    monkeypatch.setattr(svc, "get_task_executor_service", _Executor)
    monkeypatch.setattr(svc.address_repository, "list_by_company", _list)
    monkeypatch.setattr(svc.address_repository, "create", _create)

    out = await extract_address_from_website(object(), object(), _company("example.test"))

    assert out is not None
    assert created[0].crm_company_id == 11
    assert created[0].street == "Weg 1"
    assert created[0].city == "Stadt"


# ── _run_extraction ──────────────────────────────────────────────────────────


def _executor(exec_result: dict[str, Any]) -> Any:
    async def _execute_task(**_kw: Any) -> dict[str, Any]:
        return exec_result

    return SimpleNamespace(execute_task=_execute_task)


@pytest.mark.asyncio
async def test_run_extraction_returns_none_on_task_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(svc, "get_task_executor_service", lambda: _executor({"success": False}))
    assert await _run_extraction(object(), "text", 1) is None


@pytest.mark.asyncio
async def test_run_extraction_returns_none_when_no_fields_found(monkeypatch: pytest.MonkeyPatch) -> None:
    empty = AddressExtractionResult()  # all fields None
    monkeypatch.setattr(svc, "get_task_executor_service", lambda: _executor({"success": True, "result": empty}))
    assert await _run_extraction(object(), "text", 1) is None


@pytest.mark.asyncio
async def test_run_extraction_returns_result_with_any_field(monkeypatch: pytest.MonkeyPatch) -> None:
    result = AddressExtractionResult(zip="12345")
    monkeypatch.setattr(svc, "get_task_executor_service", lambda: _executor({"success": True, "result": result}))
    assert await _run_extraction(object(), "text", 1) is result


# ── _upsert_extracted_address ────────────────────────────────────────────────


def _addr(aid: int, *, empty: bool, primary: bool) -> SimpleNamespace:
    return SimpleNamespace(id=aid, empty=empty, is_primary=primary)


@pytest.mark.asyncio
async def test_upsert_fills_empty_primary_shell(monkeypatch: pytest.MonkeyPatch) -> None:
    shell = _addr(1, empty=True, primary=True)
    updated: list[int] = []

    async def _list(_db: Any, _cid: int) -> list[SimpleNamespace]:
        return [shell]

    async def _update(_db: Any, aid: int, _data: Any) -> Any:
        updated.append(aid)
        return SimpleNamespace(id=aid, street="Weg 1", zip="1", city="Stadt")

    monkeypatch.setattr(svc, "has_address_data", lambda a: not a.empty)
    monkeypatch.setattr(svc.address_repository, "list_by_company", _list)
    monkeypatch.setattr(svc.address_repository, "update", _update)

    result = AddressExtractionResult(street="Weg 1", zip="1", city="Stadt")
    out = await _upsert_extracted_address(object(), 11, result)
    assert updated == [1]
    assert out.id == 1


@pytest.mark.asyncio
async def test_upsert_prefers_empty_non_primary_when_primary_filled(monkeypatch: pytest.MonkeyPatch) -> None:
    filled = _addr(1, empty=False, primary=True)
    shell = _addr(2, empty=True, primary=False)
    updated: list[int] = []

    async def _list(_db: Any, _cid: int) -> list[SimpleNamespace]:
        return [filled, shell]

    async def _update(_db: Any, aid: int, _data: Any) -> Any:
        updated.append(aid)
        return SimpleNamespace(id=aid, street="x", zip="y", city="z")

    monkeypatch.setattr(svc, "has_address_data", lambda a: not a.empty)
    monkeypatch.setattr(svc.address_repository, "list_by_company", _list)
    monkeypatch.setattr(svc.address_repository, "update", _update)

    await _upsert_extracted_address(object(), 11, AddressExtractionResult(street="x"))
    assert updated == [2]


@pytest.mark.asyncio
async def test_upsert_creates_when_no_empty_shell(monkeypatch: pytest.MonkeyPatch) -> None:
    created: list[Any] = []

    async def _list(_db: Any, _cid: int) -> list[SimpleNamespace]:
        return [_addr(1, empty=False, primary=True)]

    async def _create(_db: Any, data: Any) -> Any:
        created.append(data)
        return SimpleNamespace(id=99, street="x", zip="y", city="z")

    monkeypatch.setattr(svc, "has_address_data", lambda a: not a.empty)
    monkeypatch.setattr(svc.address_repository, "list_by_company", _list)
    monkeypatch.setattr(svc.address_repository, "create", _create)

    out = await _upsert_extracted_address(object(), 11, AddressExtractionResult(street="x"))
    assert created
    assert out.id == 99
