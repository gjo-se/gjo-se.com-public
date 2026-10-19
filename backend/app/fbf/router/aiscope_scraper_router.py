"""Aiscope admin endpoints: unified scraper trigger and status."""

from typing import Any, cast

import structlog
from fastapi import APIRouter, BackgroundTasks, Body, Query, status

from app.fbf.infrastructure import scraper_status_client
from app.fbf.schemas.aiscope_router_schemas import ScraperRunRequest
from app.shared.security.dependencies.auth_dependencies import AdminUser

logger = structlog.get_logger(__name__)


router = APIRouter()


@router.post(
    "/scraper/run",
    status_code=status.HTTP_200_OK,
    summary="Unified Scraper Trigger – alle aktiven Portale (Admin)",
)
async def run_all_scrapers(
    _: AdminUser,
    background_tasks: BackgroundTasks,
    body: ScraperRunRequest = Body(default_factory=ScraperRunRequest),
    async_mode: bool = Query(True, description="Run in background; poll GET /scraper/status for progress"),
) -> dict[str, object]:
    """Starts the scraper run – on prod as an isolated Fargate job.

    On **prod** the always-on API no longer starts Chromium in-process: it
    dispatches the dedicated Fargate scraper job (``gjo-se-prod-scraper``) via
    ``ecs:RunTask`` and returns immediately with ``{"status": "launched"}``.

    Outside prod (local dev, no ECS) the scraper+mapper run stays in-process
    (dev working environment – no separate job exists locally).
    """
    if _uses_ecs_scraper_job():
        return _launch_scraper_job(body)

    if async_mode:
        background_tasks.add_task(_run_scraper_async, body)
        return {"status": "started"}
    return await _run_scraper_sync(body)


def _uses_ecs_scraper_job() -> bool:
    """True when the scraper should be dispatched to the Fargate job (prod only)."""
    from app.shared.config.config import settings

    return settings.ENVIRONMENT == "prod"


def _launch_scraper_job(body: ScraperRunRequest) -> dict[str, object]:
    """Dispatch the Fargate scraper job (prod) and report a launch summary.

    Status lies after launch in the job (Exit-Code + DB-Zählung), not in the
    in-process singleton – so ``scraper_status`` is intentionally left untouched
    here.
    """
    from app.fbf.jobs.scraper_dispatch_job import (
        dispatch_scraper_job,
    )

    try:
        task_arn = dispatch_scraper_job(
            force_full=body.force_full,
            max_results=body.effective_max_results,
            since_days=body.since_days,
        )
    except Exception:
        logger.exception("run_all_scrapers: scraper job dispatch failed")
        return {"status": "error", "saved": 0}
    logger.info("run_all_scrapers: scraper job launched task_arn=%s", task_arn)
    return {"status": "launched", "task_arn": task_arn}


@router.get(
    "/scraper/status",
    status_code=status.HTTP_200_OK,
    summary="Live progress of the current scraper+mapper run (Admin)",
)
async def get_scraper_status(
    _: AdminUser,
) -> dict[str, object]:
    """Returns the current scraper/mapper progress.

    Poll this endpoint while ``running`` is true to display live
    updates in the admin UI. Once ``phase`` is ``done`` or ``error``,
    the run has finished.
    """
    return scraper_status_client.get_status().to_dict()


@router.post(
    "/scraper/abort",
    status_code=status.HTTP_200_OK,
    summary="Aktuellen Scraper-Lauf abbrechen (Admin)",
)
async def abort_scraper(
    _: AdminUser,
) -> dict[str, str]:
    """Setzt das abort-flag fuer den laufenden Scraper/Mapper-Lauf.

    Der Scraper und Mapper pruefen das Flag periodisch und beenden
    sich beim naechsten Check-Point.
    """
    scraper_status_client.request_abort()
    return {"status": "aborted"}


# ── Scraper runner helpers ────────────────────────────────────────────────────


async def _run_scraper_sync(body: ScraperRunRequest) -> dict[str, object]:
    """Legacy synchronous execution – returns result directly."""
    scraper_status_client.start_run()
    try:
        result = await _execute_scraper_run(body)
        if result.get("status") == "error":
            scraper_status_client.fail_run("Unified scraper run failed – see backend logs for details")
            return result
        stats_raw = result.get("stats", {})
        stats: dict[str, object] = stats_raw if isinstance(stats_raw, dict) else {}
        scraper_status_client.finish_run(cast("dict[str, Any]", stats))
        return result
    except Exception:
        logger.exception("Unified scraper run failed")
        scraper_status_client.fail_run("Unified scraper run failed – see backend logs for details")
        return {"status": "error", "saved": 0}


async def _run_scraper_async(body: ScraperRunRequest) -> None:
    """Background task – updates status singleton, no return value."""
    scraper_status_client.start_run()
    try:
        result = await _execute_scraper_run(body)
        if scraper_status_client.is_aborted():
            scraper_status_client.fail_run("Vom Benutzer abgebrochen.")
            return
        if result.get("status") == "error":
            scraper_status_client.fail_run("Unified scraper run failed – see backend logs for details")
            return
        stats_raw = result.get("stats", {})
        stats: dict[str, object] = stats_raw if isinstance(stats_raw, dict) else {}
        scraper_status_client.finish_run(cast("dict[str, Any]", stats))
    except Exception:
        logger.exception("Unified scraper run failed")
        scraper_status_client.fail_run("Unified scraper run failed – see backend logs for details")


async def _execute_scraper_run(body: ScraperRunRequest) -> dict[str, object]:
    """Core scraper+mapper logic – delegates to the single canonical orchestrator.

    Keine eigene Orchestrierung: dev (hier) und der prod-Fargate-Job rufen
    dieselbe ``unified_scraper_service.run_unified_scraper`` auf (SSOT-Regel).
    """
    from app.fbf.dependencies.fbf_dependencies import (
        get_embedding_service,
        get_freelancermap_mapper_client,
        get_freelancermap_scraping_service,
    )
    from app.fbf.services.unified_scraper_service import (
        run_unified_scraper,
    )

    return await run_unified_scraper(
        force_full=body.force_full,
        max_results=body.effective_max_results,
        since_days=body.since_days,
        scraper_factory=get_freelancermap_scraping_service,
        mapper=get_freelancermap_mapper_client(get_embedding_service()),
    )


# ── Chart data endpoints (Admin) ─────────────────────────────────────────────
