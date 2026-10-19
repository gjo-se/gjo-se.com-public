"""GoogleSearchService – Web-Suche via Brave + Tavily.

Kapselt die parallele Suche ueber Brave Search API und Tavily, URL-Dedup,
Page-Fetch, Query-Building und Agentur-Ausschluss.

Act 1+2+5 der Endkunden-Recherche-Pipeline (Epic 12).
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from http import HTTPStatus

import httpx
import structlog

from app.shared.config.config import settings

logger = structlog.get_logger(__name__)

#: Freelancer-Plattform-Domains, die als Agenturen ausgeschlossen werden.
AGENCY_BLACKLIST_URLS: frozenset[str] = frozenset(
    {
        "freelancermap.de",
        "gulp.de",
        "freelance.de",
        "freelancer.de",
        "solcom.de",
        "hays.de",
        "gittigidiyor.com",
        "etengo.de",
        "it-freelancer-magazin.de",
    }
)

#: HTTP-Timeout in Sekunden fuer API-Calls.
_REQUEST_TIMEOUT: float = 15.0

#: Maximale Anzahl Retries bei 429-Rate-Limit.
_MAX_RETRIES: int = 3


@dataclass(frozen=True, slots=True)
class SearchResult:
    """Ein dedupliziertes Suchergebnis einer Web-API.

    Attributes:
        url: Gefundene URL.
        title: Seitentitel.
        snippet: Kurzbeschreibung / Snippet.
        source: Quelle des Ergebnisses (``"brave"`` oder ``"tavily"``).
    """

    url: str
    title: str = ""
    snippet: str = ""
    source: str = ""


def _is_agency(url: str) -> bool:
    """Prueft ob eine URL zu einer Agentur/Freelancer-Plattform gehoert.

    Args:
        url: Zu pruefende URL.

    Returns:
        ``True`` wenn die Domain auf der Blacklist steht.
    """
    from urllib.parse import urlparse

    try:
        domain = urlparse(url).hostname or ""
    except ValueError:
        return False
    return any(blacklisted in domain for blacklisted in AGENCY_BLACKLIST_URLS)


def _deduplicate(results: list[SearchResult]) -> list[SearchResult]:
    """Entfernt doppelte URLs und Agentur-Domains.

    Behaelt das erste Vorkommen einer URL (hoechste Prioritaet).
    Filtert zusaetzlich alle Agentur-URLs heraus.

    Args:
        results: Rohe Suchergebnisse (potenziell mit Duplikaten).

    Returns:
        Deduplizierte, agenturbereinigte Ergebnisliste.
    """
    seen: set[str] = set()
    deduped: list[SearchResult] = []
    for result in results:
        if result.url in seen:
            continue
        if _is_agency(result.url):
            continue
        seen.add(result.url)
        deduped.append(result)
    return deduped


async def _brave_search(query: str) -> list[SearchResult]:
    """Fuehrt eine Brave Web Search durch.

    API: ``GET https://api.search.brave.com/res/v1/web/search``
    Header: ``X-Subscription-Token`` = ``settings.BRAVE_API_KEY``

    Args:
        query: Such-Query-String.

    Returns:
        Liste von ``SearchResult`` (leer bei Fehler).
    """
    api_key = settings.BRAVE_API_KEY
    if not api_key:
        logger.warning("BRAVE_API_KEY is empty – skipping Brave search")
        return []

    url = "https://api.search.brave.com/res/v1/web/search"
    headers = {
        "X-Subscription-Token": api_key,
        "Accept": "application/json",
    }
    params = {"q": query, "count": 10}

    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT) as client:
                response = await client.get(url, headers=headers, params=params)
        except httpx.HTTPError:
            logger.warning("Brave search attempt %d failed (network error)", attempt, exc_info=True)
            if attempt < _MAX_RETRIES:
                await asyncio.sleep(2**attempt)
            continue

        if response.status_code == HTTPStatus.TOO_MANY_REQUESTS:
            wait = 2**attempt
            logger.warning("Brave search rate-limited (429) – attempt %d, waiting %ds", attempt, wait)
            await asyncio.sleep(wait)
            continue

        if response.status_code != HTTPStatus.OK:
            logger.warning(
                "Brave search HTTP %d (attempt %d): %s",
                response.status_code,
                attempt,
                response.text[:200],
            )
            return []

        try:
            data = response.json()
            web = data.get("web", {})
            raw_results = web.get("results", [])
        except Exception:
            logger.exception("Brave search response parse error")
            return []

        return [
            SearchResult(
                url=r.get("url", ""),
                title=r.get("title", ""),
                snippet=r.get("description", ""),
                source="brave",
            )
            for r in raw_results
            if r.get("url")
        ]

    # All retries exhausted
    logger.error("Brave search failed after %d attempts – giving up", _MAX_RETRIES)
    return []


async def _tavily_search(query: str) -> list[SearchResult]:
    """Fuehrt eine Tavily Search durch.

    API: ``POST https://api.tavily.com/search``
    Body: ``{"query": query, "max_results": 10, "api_key": ...}``

    Args:
        query: Such-Query-String.

    Returns:
        Liste von ``SearchResult`` (leer bei Fehler).
    """
    api_key = settings.TAVILY_API_KEY
    if not api_key:
        logger.warning("TAVILY_API_KEY is empty – skipping Tavily search")
        return []

    url = "https://api.tavily.com/search"
    payload = {
        "query": query,
        "max_results": 10,
        "api_key": api_key,
    }

    try:
        async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT) as client:
            response = await client.post(url, json=payload)
    except httpx.HTTPError:
        logger.warning("Tavily search failed (network error)", exc_info=True)
        return []

    if response.status_code != HTTPStatus.OK:
        logger.warning("Tavily search HTTP %d: %s", response.status_code, response.text[:200])
        return []

    try:
        data = response.json()
        raw_results = data.get("results", [])
    except Exception:
        logger.exception("Tavily search response parse error")
        return []

    return [
        SearchResult(
            url=r.get("url", ""),
            title=r.get("title", ""),
            snippet=r.get("content", ""),
            source="tavily",
        )
        for r in raw_results
        if r.get("url")
    ]


async def search(query: str) -> list[SearchResult]:
    """Parallele Suche ueber Brave + Tavily mit URL-Dedup.

    Args:
        query: Such-Query-String.

    Returns:
        Deduplizierte, agenturbereinigte ``SearchResult``-Liste.
    """
    if not query.strip():
        return []

    brave_results, tavily_results = await asyncio.gather(
        _brave_search(query),
        _tavily_search(query),
        return_exceptions=True,
    )

    combined: list[SearchResult] = []
    if not isinstance(brave_results, BaseException):
        combined.extend(brave_results)
    if not isinstance(tavily_results, BaseException):
        combined.extend(tavily_results)

    return _deduplicate(combined)


async def search_multiple(queries: list[str]) -> list[SearchResult]:
    """Parallele Suche ueber mehrere Queries, globaler URL-Dedup.

    Args:
        queries: Liste von Such-Query-Strings (1–4 Queries).

    Returns:
        Global deduplizierte ``SearchResult``-Liste.
    """
    if not queries:
        return []

    all_results: list[SearchResult] = []
    tasks = [search(q) for q in queries if q.strip()]
    task_results = await asyncio.gather(*tasks, return_exceptions=True)

    for result in task_results:
        if isinstance(result, BaseException):
            continue
        all_results.extend(result)

    return _deduplicate(all_results)


async def fetch_page_text(url: str) -> str | None:
    """Lade den Text-Inhalt einer Webseite via HTTP GET.

    Args:
        url: Ziel-URL.

    Returns:
        Response-Text als String oder ``None`` bei Fehler (Timeout, HTTP-Fehler).
    """
    if not url:
        return None

    try:
        async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT) as client:
            response = await client.get(url, follow_redirects=True)
    except httpx.HTTPError:
        logger.warning("fetch_page_text failed for %s (network error)", url, exc_info=True)
        return None

    if response.status_code != HTTPStatus.OK:
        logger.warning("fetch_page_text HTTP %d for %s", response.status_code, url)
        return None

    return response.text


def build_queries(
    signals: object | None = None,
    industry: str | None = None,
    city: str | None = None,
    skills: str | None = None,
    title: str | None = None,
) -> list[str]:
    """Erzeugt 1–4 Such-Queries aus Projekt-Signalen.

    Queries werden nur erzeugt, wenn die benoetigten Daten vorhanden sind.
    Leere Queries werden uebersprungen.

    Args:
        signals: ``EndcustomerSignalsOut``-Instanz oder ``None``.
        industry: Branche des Projekts (string oder None).
        city: Stadt des Projekts (string oder None).
        skills: Komma-separierte Skill-Liste (string oder None).
        title: Projekt-Titel (string oder None), Fallback für Query 1.

    Returns:
        Liste von 1–4 Query-Strings.
    """
    queries: list[str] = []

    company_hints: list[str] = getattr(signals, "company_hints", []) or []
    product_hints: list[str] = getattr(signals, "product_hints", []) or []
    unique_phrases: list[str] = getattr(signals, "unique_phrases", []) or []
    tech_stack_summary: str = getattr(signals, "tech_stack_summary", "") or ""

    # Query 1: Firmenname + Stadt (fallback: Produkthints + Stadt, Projekt-Titel + Stadt)
    query1_name = company_hints[0] if company_hints else product_hints[0] if product_hints else title
    if query1_name and city:
        queries.append(f"{query1_name} {city} Karriere")

    # Query 2: Produkthints + Branche (fallback: Produkthints + Stadt)
    if product_hints:
        if industry:
            queries.append(f"{product_hints[0]} {industry} Karriere")
        elif city:
            queries.append(f"{product_hints[0]} {city} Karriere")
        else:
            queries.append(f"{product_hints[0]} Karriere")

    # Query 3: Markante Phrasen + Skills
    skills_list = [s.strip() for s in (skills or "").split(",") if s.strip()]
    if unique_phrases and skills_list:
        queries.append(f'"{unique_phrases[0]}" {skills_list[0]}')

    # Query 4: Tech-Stack + Branche (fallback: Tech-Stack + Stadt)
    if tech_stack_summary:
        if industry:
            queries.append(f"{tech_stack_summary} {industry} Karriere")
        elif city:
            queries.append(f"{tech_stack_summary} {city} Karriere")
        else:
            queries.append(f"{tech_stack_summary} Karriere")

    return queries


class GoogleSearchService:
    """Zentraler Service fuer Web-Suche in der Endkunden-Pipeline.

    Bietet Instanz-Methoden als Convenience-Wrapper, die auf den
    Modul-Funktionen basieren. Alle Methoden sind ``async``.
    """

    def __init__(self) -> None:
        self._agency_blacklist: frozenset[str] = AGENCY_BLACKLIST_URLS

    async def search(self, query: str) -> list[SearchResult]:
        """Wrapper fuer ``search()``."""
        return await search(query)

    async def search_multiple(self, queries: list[str]) -> list[SearchResult]:
        """Wrapper fuer ``search_multiple()``."""
        return await search_multiple(queries)

    async def fetch_page_text(self, url: str) -> str | None:
        """Wrapper fuer ``fetch_page_text()``."""
        return await fetch_page_text(url)

    def build_queries(
        self,
        signals: object | None = None,
        industry: str | None = None,
        city: str | None = None,
        skills: str | None = None,
        title: str | None = None,
    ) -> list[str]:
        """Wrapper fuer ``build_queries()``."""
        return build_queries(signals, industry, city, skills, title)
