"""Restate activity – Act 5: Page Fetch.

Lädt den Text-Inhalt der Karriereseite jedes pending Candidates
via ``GoogleSearchService.fetch_page_text()`` und persistiert ihn
in ``candidate.career_page_description``.

Three-phase approach (MergeActivity-Pattern):
1. Fetch – GjoDB: Lade Candidates mit ``career_page_url``.
2. HTTP – Fetche jede Seite via ``GoogleSearchService``.
3. Persist – GjoDB: Schreibe ``career_page_description``.
"""

from __future__ import annotations

from typing import Any

import structlog
from restate import Context, Service

from app.fbf.repositories import project_endcustomer_candidate_read_repository as candidate_read_repo
from app.fbf.repositories import project_endcustomer_candidate_repository as repo
from app.fbf.services.google_search_service import fetch_page_text
from app.shared.db_access.session import AsyncSessionLocal as GjoDB

logger = structlog.get_logger(__name__)

endcustomer_page_fetch_service = Service("EndcustomerPageFetchActivity")


@endcustomer_page_fetch_service.handler()
async def run(ctx: Context, arg: dict[str, Any]) -> dict[str, Any]:
    """Fetch career page texts for all pending candidates.

    Args:
        ctx: Restate workflow context.
        arg: Dict with ``project_id`` (int) and optional ``trigger`` (str).

    Returns:
        Dict with ``project_id``, ``fetched`` (int), ``failed`` (int).
    """
    project_id: int = arg["project_id"]

    # ── Phase 1: Fetch candidates (short-lived GjoDB session) ─────────────
    async with GjoDB() as gjo_db:
        rows = await candidate_read_repo.get_by_project_rows(gjo_db, project_id)

    # Filter: only pending candidates with a career_page_url
    to_fetch = [row.candidate for row in rows if row.status == "pending" and row.candidate.career_page_url]

    if not to_fetch:
        logger.info("Act 5: no pending candidates with career_page_url for project %d", project_id)
        return {"project_id": project_id, "fetched": 0, "failed": 0}

    # ── Phase 2: HTTP fetch (no DB session held) ──────────────────────────
    fetched: dict[int, str] = {}
    failed: int = 0

    for candidate in to_fetch:
        if not candidate.career_page_url:
            continue
        try:
            text = await fetch_page_text(candidate.career_page_url)
        except Exception:
            logger.exception("Act 5: fetch failed for candidate %d (url=%s)", candidate.id, candidate.career_page_url)
            failed += 1
            continue

        if text is not None:
            fetched[candidate.id] = text
        else:
            failed += 1

    # ── Phase 3: Persist results (fresh GjoDB session) ────────────────────
    async with GjoDB() as gjo_db:
        for candidate_id, text in fetched.items():
            await repo.update_fields(gjo_db, candidate_id, career_page_description=text)

    logger.info(
        "Act 5: project_id=%d fetched=%d failed=%d",
        project_id,
        len(fetched),
        failed,
    )
    return {"project_id": project_id, "fetched": len(fetched), "failed": failed}
