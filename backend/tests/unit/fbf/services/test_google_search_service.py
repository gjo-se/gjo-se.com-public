"""Unit tests for the GoogleSearchService (Brave + Tavily, URL dedup, queries).

No real network: HTTP is faked with ``respx`` (the ``mock_external_http``
fixture for the search flow, an inline router for page fetch). Query building,
agency filtering and URL dedup are pure.
"""

from __future__ import annotations

import json
from dataclasses import FrozenInstanceError
from types import SimpleNamespace

import httpx
import pytest
import respx
from httpx import Response

from app.fbf.services import google_search_service
from app.fbf.services.google_search_service import (
    SearchResult,
    _brave_search,
    _is_agency,
    _tavily_search,
)
from app.shared.config.config import settings

pytestmark = pytest.mark.unit


def _set_keys(monkeypatch: pytest.MonkeyPatch, *, brave: str = "", tavily: str = "") -> None:
    """Patch the settings singleton with fixed API keys (mirrors the HTTP fixture)."""
    monkeypatch.setattr(settings, "BRAVE_API_KEY", brave)
    monkeypatch.setattr(settings, "TAVILY_API_KEY", tavily)


class _LogCapture:
    """Structlog double recording warning call argument tuples."""

    def __init__(self) -> None:
        self.warnings: list[tuple[object, ...]] = []
        self.errors: list[tuple[object, ...]] = []

    def warning(self, *args: object, **kwargs: object) -> None:
        del kwargs
        self.warnings.append(args)

    def error(self, *args: object, **kwargs: object) -> None:
        del kwargs
        self.errors.append(args)

    def exception(self, *args: object, **kwargs: object) -> None:
        del args, kwargs


# ── build_queries (decision table) ───────────────────────────────────────────


def test_build_queries_empty_signals_yields_no_query() -> None:
    """Without any signal there is no query to build."""
    assert google_search_service.build_queries() == []


def test_build_queries_title_with_city_falls_back_to_query_one() -> None:
    """With no hints the title + city form query 1."""
    queries = google_search_service.build_queries(title="Data Platform", city="Berlin")

    assert queries == ["Data Platform Berlin Karriere"]


def test_build_queries_full_signals_yields_all_four_queries() -> None:
    """All four evidence sources produce exactly four ordered queries."""
    signals = SimpleNamespace(
        company_hints=["Beispielkunde GmbH"],
        product_hints=["Musterfirma"],
        unique_phrases=["einzigartige Phrase"],
        tech_stack_summary="Python, FastAPI",
    )

    queries = google_search_service.build_queries(
        signals,
        industry="IT",
        city="Berlin",
        skills="Python, AWS",
    )

    assert queries == [
        "Beispielkunde GmbH Berlin Karriere",
        "Musterfirma IT Karriere",
        '"einzigartige Phrase" Python',
        "Python, FastAPI IT Karriere",
    ]


def test_build_queries_uses_first_company_hint() -> None:
    """The first company hint is used, not the last."""
    signals = SimpleNamespace(company_hints=["Erste GmbH", "Zweite GmbH"])

    assert google_search_service.build_queries(signals, city="Berlin") == ["Erste GmbH Berlin Karriere"]


def test_build_queries_product_hint_without_industry_uses_city() -> None:
    """Without an industry the product hint falls back to the city (query 1 and 2 coincide)."""
    signals = SimpleNamespace(product_hints=["Musterfirma"])

    assert google_search_service.build_queries(signals, city="Berlin") == [
        "Musterfirma Berlin Karriere",
        "Musterfirma Berlin Karriere",
    ]


def test_build_queries_product_hint_without_industry_or_city() -> None:
    """Without industry or city the product hint stands alone."""
    signals = SimpleNamespace(product_hints=["Musterfirma"])

    assert google_search_service.build_queries(signals) == ["Musterfirma Karriere"]


def test_build_queries_tech_stack_without_industry_uses_city() -> None:
    """The tech stack falls back to the city when no industry is given."""
    signals = SimpleNamespace(tech_stack_summary="Python")

    assert google_search_service.build_queries(signals, city="Berlin") == ["Python Berlin Karriere"]


def test_build_queries_tech_stack_without_industry_or_city() -> None:
    """The tech stack stands alone without industry or city."""
    signals = SimpleNamespace(tech_stack_summary="Python")

    assert google_search_service.build_queries(signals) == ["Python Karriere"]


def test_build_queries_phrase_without_skills_is_skipped() -> None:
    """A unique phrase without skills produces no query."""
    signals = SimpleNamespace(unique_phrases=["Phrase"])

    assert google_search_service.build_queries(signals) == []


def test_build_queries_skills_without_phrase_is_skipped() -> None:
    """Skills without a unique phrase produce no query."""
    assert google_search_service.build_queries(skills="Python") == []


def test_build_queries_title_without_city_yields_nothing() -> None:
    """A title alone (no city) produces no query."""
    assert google_search_service.build_queries(title="Data Platform") == []


# ── _is_agency / _deduplicate (EP) ───────────────────────────────────────────


def test_is_agency_true_for_blacklisted_platform() -> None:
    """A freelancer-platform domain is recognised as an agency."""
    assert _is_agency("https://www.freelancermap.de/projekt/x") is True


def test_is_agency_false_for_endcustomer_domain() -> None:
    """An unrelated end-customer domain is not an agency."""
    assert _is_agency("https://example-kunde.de/karriere") is False


def test_deduplicate_keeps_first_url_and_drops_agencies() -> None:
    """Duplicates collapse to their first occurrence and agencies are removed."""
    results = [
        SearchResult(url="https://example-kunde.de/karriere", source="brave"),
        SearchResult(url="https://example-kunde.de/karriere", source="tavily"),
        SearchResult(url="https://www.gulp.de/projekt/y", source="tavily"),
    ]

    deduped = google_search_service._deduplicate(results)

    assert [result.url for result in deduped] == ["https://example-kunde.de/karriere"]
    assert deduped[0].source == "brave"


# ── search (integration of both providers, hermetically faked) ───────────────


async def test_search_returns_empty_for_blank_query() -> None:
    """A blank query short-circuits to an empty result."""
    assert await google_search_service.search("   ") == []


async def test_search_merges_both_providers_deduplicated(mock_external_http: respx.Router) -> None:
    """Brave + Tavily results are merged and de-duplicated by URL."""
    results = await google_search_service.search("Beispielkunde")

    assert {result.url for result in results} == {
        "https://example-kunde.de",
        "https://example-kunde.de/karriere",
        "https://musterfirma.de/jobs",
    }


# ── fetch_page_text (HTTP error paths) ───────────────────────────────────────


async def test_fetch_page_text_returns_body_on_success() -> None:
    """A 200 response returns the page body."""
    with respx.mock:
        respx.get("https://example-kunde.de/karriere").mock(return_value=Response(200, text="<html>ok</html>"))

        assert await google_search_service.fetch_page_text("https://example-kunde.de/karriere") == "<html>ok</html>"


async def test_fetch_page_text_returns_none_on_http_error_status() -> None:
    """A non-200 response degrades to ``None``."""
    with respx.mock:
        respx.get("https://example-kunde.de/missing").mock(return_value=Response(404, text="nope"))

        assert await google_search_service.fetch_page_text("https://example-kunde.de/missing") is None


async def test_fetch_page_text_returns_none_for_empty_url() -> None:
    """An empty URL is rejected without an HTTP call."""
    assert await google_search_service.fetch_page_text("") is None


# ── _brave_search (error paths) ──────────────────────────────────────────────


async def test_brave_search_without_api_key_returns_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    """No Brave key means the search is skipped."""
    _set_keys(monkeypatch)

    assert await _brave_search("q") == []


async def test_brave_search_maps_results_and_drops_url_less(monkeypatch: pytest.MonkeyPatch) -> None:
    """Results are mapped and entries without a URL are dropped."""
    _set_keys(monkeypatch, brave="k")
    payload = {"web": {"results": [{"url": "https://x.de", "title": "T", "description": "D"}, {"title": "no-url"}]}}
    with respx.mock:
        respx.get("https://api.search.brave.com/res/v1/web/search").mock(return_value=Response(200, json=payload))

        results = await _brave_search("q")

    assert [(r.url, r.snippet, r.source) for r in results] == [("https://x.de", "D", "brave")]


async def test_brave_search_non_ok_status_returns_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    """A non-200/non-429 status returns an empty list immediately."""
    _set_keys(monkeypatch, brave="k")
    with respx.mock:
        respx.get("https://api.search.brave.com/res/v1/web/search").mock(return_value=Response(500))

        assert await _brave_search("q") == []


async def test_brave_search_parse_error_returns_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    """A non-JSON body is handled as an empty result."""
    _set_keys(monkeypatch, brave="k")
    with respx.mock:
        respx.get("https://api.search.brave.com/res/v1/web/search").mock(return_value=Response(200, text="not json"))

        assert await _brave_search("q") == []


# ── _tavily_search (error paths) ─────────────────────────────────────────────


async def test_tavily_search_without_api_key_returns_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    """No Tavily key means the search is skipped."""
    _set_keys(monkeypatch)

    assert await _tavily_search("q") == []


async def test_tavily_search_maps_content_to_snippet(monkeypatch: pytest.MonkeyPatch) -> None:
    """Tavily ``content`` becomes the snippet and the source is ``tavily``."""
    _set_keys(monkeypatch, tavily="k")
    payload = {"results": [{"url": "https://y.de", "title": "T", "content": "C"}]}
    with respx.mock:
        respx.post("https://api.tavily.com/search").mock(return_value=Response(200, json=payload))

        results = await _tavily_search("q")

    assert [(r.url, r.snippet, r.source) for r in results] == [("https://y.de", "C", "tavily")]


async def test_tavily_search_non_ok_status_returns_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    """A non-200 status returns an empty list."""
    _set_keys(monkeypatch, tavily="k")
    with respx.mock:
        respx.post("https://api.tavily.com/search").mock(return_value=Response(503))

        assert await _tavily_search("q") == []


# ── search / search_multiple (exception tolerance + dedup) ───────────────────


async def test_search_survives_one_provider_exception(monkeypatch: pytest.MonkeyPatch) -> None:
    """If one provider raises unexpectedly, the other provider's results are kept."""
    _set_keys(monkeypatch, brave="k", tavily="k")

    with respx.mock:
        # Brave raises a non-HTTP error (unexpected failure) → search must tolerate it.
        respx.get("https://api.search.brave.com/res/v1/web/search").mock(side_effect=RuntimeError("provider down"))
        respx.post("https://api.tavily.com/search").mock(
            return_value=Response(200, json={"results": [{"url": "https://ok.de"}]})
        )

        results = await google_search_service.search("q")

    assert [r.url for r in results] == ["https://ok.de"]


async def test_search_returns_empty_when_both_providers_fail(monkeypatch: pytest.MonkeyPatch) -> None:
    """When both providers raise unexpectedly, the result is empty."""
    _set_keys(monkeypatch, brave="k", tavily="k")

    with respx.mock:
        respx.get("https://api.search.brave.com/res/v1/web/search").mock(side_effect=RuntimeError("down"))
        respx.post("https://api.tavily.com/search").mock(side_effect=RuntimeError("down"))

        results = await google_search_service.search("q")

    assert results == []


async def test_search_multiple_empty_returns_empty() -> None:
    """No queries means no search."""
    assert await google_search_service.search_multiple([]) == []


async def test_search_multiple_filters_blanks_and_dedups_across_queries(monkeypatch: pytest.MonkeyPatch) -> None:
    """Blank queries are skipped and URLs deduplicated across queries."""
    seen: list[str] = []

    async def _search(query: str) -> list[SearchResult]:
        seen.append(query)
        return [SearchResult(url="https://a.de")]

    monkeypatch.setattr(google_search_service, "search", _search)

    results = await google_search_service.search_multiple(["x", "   ", "y"])

    assert seen == ["x", "y"]
    assert [r.url for r in results] == ["https://a.de"]


async def test_search_multiple_skips_failing_query(monkeypatch: pytest.MonkeyPatch) -> None:
    """A query whose search raises is skipped without failing the batch."""

    async def _search(query: str) -> list[SearchResult]:
        if query == "bad":
            raise RuntimeError("boom")
        return [SearchResult(url="https://a.de")]

    monkeypatch.setattr(google_search_service, "search", _search)

    assert [r.url for r in await google_search_service.search_multiple(["bad", "good"])] == ["https://a.de"]


# ── freeze/slots + request parameters ────────────────────────────────────────


def test_search_result_is_frozen_and_slotted() -> None:
    """SearchResult is immutable and uses slots (no instance __dict__)."""
    result = SearchResult(url="u")

    assert not hasattr(result, "__dict__")
    with pytest.raises(FrozenInstanceError):
        result.url = "v"


async def test_brave_search_sends_count_param_and_token(monkeypatch: pytest.MonkeyPatch) -> None:
    """Brave is queried with count=10 and the subscription token header."""
    _set_keys(monkeypatch, brave="k")
    captured: dict[str, object] = {}

    def _respond(request: httpx.Request) -> Response:
        captured["count"] = request.url.params.get("count")
        captured["token"] = request.headers.get("X-Subscription-Token")
        return Response(200, json={"web": {"results": []}})

    with respx.mock:
        respx.get("https://api.search.brave.com/res/v1/web/search").mock(side_effect=_respond)

        await _brave_search("q")

    assert captured["count"] == "10"
    assert captured["token"] == "k"


async def test_tavily_search_sends_max_results_and_key(monkeypatch: pytest.MonkeyPatch) -> None:
    """Tavily is queried with max_results=10, the query and the api key."""
    _set_keys(monkeypatch, tavily="k")
    captured: dict[str, object] = {}

    def _respond(request: httpx.Request) -> Response:
        captured.update(json.loads(request.content))
        return Response(200, json={"results": []})

    with respx.mock:
        respx.post("https://api.tavily.com/search").mock(side_effect=_respond)

        await _tavily_search("q")

    assert captured == {"query": "q", "max_results": 10, "api_key": "k"}


# ── retry loop (429 / network) ───────────────────────────────────────────────


async def test_brave_search_retries_on_429_with_exponential_waits(monkeypatch: pytest.MonkeyPatch) -> None:
    """Persistent 429s cause exactly three attempts with waits 2/4/8 seconds."""
    _set_keys(monkeypatch, brave="k")
    waits: list[float] = []

    async def _sleep(delay: float) -> None:
        waits.append(delay)

    monkeypatch.setattr(google_search_service.asyncio, "sleep", _sleep)
    calls: list[httpx.Request] = []

    def _respond(request: httpx.Request) -> Response:
        calls.append(request)
        return Response(429)

    with respx.mock:
        respx.get("https://api.search.brave.com/res/v1/web/search").mock(side_effect=_respond)

        result = await _brave_search("q")

    assert result == []
    assert waits == [2, 4, 8]
    assert len(calls) == 3


async def test_brave_search_retries_on_network_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """A network error is retried twice, waiting 2 and 4 seconds."""
    _set_keys(monkeypatch, brave="k")
    waits: list[float] = []

    async def _sleep(delay: float) -> None:
        waits.append(delay)

    monkeypatch.setattr(google_search_service.asyncio, "sleep", _sleep)

    with respx.mock:
        respx.get("https://api.search.brave.com/res/v1/web/search").mock(side_effect=httpx.ConnectError("down"))

        result = await _brave_search("q")

    assert result == []
    assert waits == [2, 4]


async def test_brave_search_retries_then_succeeds(monkeypatch: pytest.MonkeyPatch) -> None:
    """A 429 followed by a 200 yields results after one wait."""
    _set_keys(monkeypatch, brave="k")
    waits: list[float] = []

    async def _sleep(delay: float) -> None:
        waits.append(delay)

    monkeypatch.setattr(google_search_service.asyncio, "sleep", _sleep)
    sequence = [Response(429), Response(200, json={"web": {"results": [{"url": "https://x.de"}]}})]

    def _respond(_request: httpx.Request) -> Response:
        return sequence.pop(0)

    with respx.mock:
        respx.get("https://api.search.brave.com/res/v1/web/search").mock(side_effect=_respond)

        results = await _brave_search("q")

    assert [r.url for r in results] == ["https://x.de"]
    assert waits == [2]


# ── error-body truncation in logs ────────────────────────────────────────────


async def test_brave_search_truncates_error_body_to_two_hundred(monkeypatch: pytest.MonkeyPatch) -> None:
    """The non-OK Brave error body is truncated to 200 chars in the log."""
    _set_keys(monkeypatch, brave="k")
    capture = _LogCapture()
    monkeypatch.setattr(google_search_service, "logger", capture)

    with respx.mock:
        respx.get("https://api.search.brave.com/res/v1/web/search").mock(return_value=Response(500, text="e" * 300))

        await _brave_search("q")

    assert len(capture.warnings[0][3]) == 200


async def test_tavily_search_truncates_error_body_to_two_hundred(monkeypatch: pytest.MonkeyPatch) -> None:
    """The non-OK Tavily error body is truncated to 200 chars in the log."""
    _set_keys(monkeypatch, tavily="k")
    capture = _LogCapture()
    monkeypatch.setattr(google_search_service, "logger", capture)

    with respx.mock:
        respx.post("https://api.tavily.com/search").mock(return_value=Response(503, text="e" * 300))

        await _tavily_search("q")

    assert len(capture.warnings[0][2]) == 200
