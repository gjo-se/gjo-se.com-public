"""Restate activity – Act 3: Web Search + Candidate Creation.

Erzeugt 1–4 Such-Queries aus ``EndcustomerSignalsOut``, führt 8 parallele
Suchen durch (4×Brave + 4×Tavily) und persistiert die deduplizierten
Ergebnisse als ``project_endcustomer_candidate``-Rows.

Three-phase approach:
1. HTTP – Queries bauen + ``GoogleSearchService.search_multiple()``.
2. LLM  – Firmennamen aus Suchergebnis-Titeln extrahieren (Batch).
3. Persist – GjoDB: Jedes Result mit sauberem Firmennamen anlegen.
"""

from __future__ import annotations

import json
from typing import Any
from urllib.parse import urlparse

import structlog
from restate import Context, Service

from app.fbf.repositories import project_endcustomer_candidate_repository as repo
from app.fbf.repositories import project_repository
from app.fbf.services.google_search_service import build_queries, search_multiple
from app.shared.db_access.session import AsyncSessionLocal as CoreDB
from app.shared.db_access.session import AsyncSessionLocal as GjoDB
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_task_executor_service

logger = structlog.get_logger(__name__)

endcustomer_web_search_query_service = Service("EndcustomerWebSearchQueryActivity")


def _extract_domain(url: str) -> str | None:
    """Extrahiere die Domain aus einer URL (fuer das website-Feld)."""
    try:
        parsed = urlparse(url)
        domain = parsed.hostname
        if domain:
            scheme = parsed.scheme or "https"
            return f"{scheme}://{domain}"
    except ValueError:
        pass
    return None


def _parse_company_names(raw: str, count: int) -> list[str]:
    """Parse one-company-per-line LLM output into a list of names."""
    names = [line.strip() for line in raw.strip().splitlines() if line.strip()]
    # Remove leading numbers/bullets like "1. dbt Labs" → "dbt Labs"
    cleaned: list[str] = []
    for raw_name in names:
        # Strip "1. ", "- ", "• ", etc.
        name = raw_name
        while name and (name[0].isdigit() or name[0] in ".-•*#"):
            name = name.lstrip("0123456789.-•*# ")
        cleaned.append(name)
    # Pad or truncate to match the expected count
    while len(cleaned) < count:
        cleaned.append("-")
    return cleaned[:count]


@endcustomer_web_search_query_service.handler()
async def run(ctx: Context, arg: dict[str, Any]) -> dict[str, Any]:
    """Search web for endcustomer candidates and persist them.

    Args:
        ctx: Restate workflow context.
        arg: Dict with ``project_id`` (int) and ``signals`` (dict of EndcustomerSignalsOut).

    Returns:
        Dict with ``project_id`` and ``candidates_count`` (int).
    """
    project_id: int = arg["project_id"]
    signals: dict[str, object] = arg.get("signals", {})
    trigger: str = arg.get("trigger", "pipeline")

    # ── Phase 1: Fetch project data for query building ────────────────────
    async with GjoDB() as gjo_db:
        project = await project_repository.get_by_id(gjo_db, project_id)
        if project is None:
            raise ValueError(f"Project {project_id} not found")
        industry = project.industry
        city = project.city
        title = project.title

    # Build a signals-like object for the query builder
    class _SignalsProxy:
        """Attribute stand-in exposing the signals dict to ``build_queries``."""

        company_hints = signals.get("company_hints", [])
        product_hints = signals.get("product_hints", [])
        unique_phrases = signals.get("unique_phrases", [])
        tech_stack_summary = signals.get("tech_stack_summary", "")

    # ── Phase 2: Build queries + search (no DB session) ───────────────────
    queries = build_queries(
        signals=_SignalsProxy,
        industry=industry,
        city=city,
        skills="",
        title=title,
    )

    if not queries:
        logger.info("Act 3: no queries generated for project %d", project_id)
        return {"project_id": project_id, "candidates_count": 0}

    results = await search_multiple(queries)

    if not results:
        logger.info("Act 3: no search results for project %d", project_id)
        return {"project_id": project_id, "candidates_count": 0}

    # ── Phase 2b: LLM – extract clean company names from titles+URLs ──────
    company_names: list[str] = []
    try:
        results_json = json.dumps(
            [{"title": r.title, "url": r.url} for r in results],
            ensure_ascii=False,
        )
        async with CoreDB() as core_db:
            llm_result = await get_task_executor_service().execute_task(
                db=core_db,
                task_key="endcustomer-company-name",
                variables={"results_json": results_json},
                project_id=project_id,
                trigger=trigger,
            )
        if llm_result.get("success") and llm_result.get("result"):
            raw_text = str(llm_result["result"])
            company_names = _parse_company_names(raw_text, len(results))
    except Exception:
        logger.exception("Act 3: LLM company name extraction failed, using fallback")

    # ── Phase 3: Persist candidates (short-lived GjoDB session) ───────────
    candidate_summaries: list[dict[str, str]] = []
    async with GjoDB() as gjo_db:
        for i, result in enumerate(results):
            name = company_names[i] if i < len(company_names) else result.title or result.url
            await repo.create(
                db=gjo_db,
                project_id=project_id,
                company_name=name,
                source=result.source,
                website=_extract_domain(result.url),
                career_page_url=result.url,
                confidence=0.0,
            )
            candidate_summaries.append(
                {
                    "url": result.url,
                    "title": result.title or result.url,
                    "source": result.source,
                    "company_name": name,
                }
            )
        await gjo_db.commit()

    logger.info(
        "Act 3: project_id=%d persisted %d candidates",
        project_id,
        len(results),
    )
    return {
        "project_id": project_id,
        "candidates_count": len(results),
        "candidates": candidate_summaries,
        "queries": queries,
    }
