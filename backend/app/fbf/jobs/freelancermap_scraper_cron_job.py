"""Scheduled job: run the FreelancermapScrapingService delta run.

On prod this dispatches the isolated Fargate scraper job (``gjo-se-prod-scraper``)
instead of starting Chromium in the always-on API process. Outside prod (local
dev, no ECS) the scraper runs in-process.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import structlog

if TYPE_CHECKING:
    from collections.abc import Callable

    from sqlalchemy.ext.asyncio import AsyncSession

    from app.fbf.services.freelancermap_scraping_service import FreelancermapScrapingService

logger = structlog.get_logger(__name__)


def _build_scraper(db: AsyncSession) -> FreelancermapScrapingService:
    """Composition point: wire the in-process scraper with its collaborators.

    A module-level factory is a declared wiring site (DI canon) – the collaborator
    is instantiated here, not inline in the job's control flow.
    """
    from app.fbf.infrastructure.playwright_client import PlaywrightClient
    from app.fbf.services.freelancermap_scraping_service import FreelancermapScrapingService

    return FreelancermapScrapingService(db, browser_factory=PlaywrightClient)


async def run_freelancermap_scraper(*, session_factory: Callable[[], Any] | None = None) -> None:
    """Run the freelancermap delta scrape (dispatched on prod, in-process on dev).

    Args:
        session_factory: Optional factory returning an async session context
            manager. Defaults to the configured ``AsyncSessionLocal``; tests
            inject a fake at this boundary instead of patching DB internals.
    """
    from app.shared.config.config import settings

    if settings.ENVIRONMENT == "prod":
        from app.fbf.jobs.scraper_dispatch_job import dispatch_scraper_job

        task_arn = dispatch_scraper_job()
        logger.info("freelancermap_scraper: dispatched job task_arn=%s", task_arn)
        return

    from app.shared.credential_store.dependencies.credential_store_dependencies import (
        get_admin_credential_service,
    )

    if session_factory is None:
        from app.shared.db_access.session import AsyncSessionLocal

        session_factory = AsyncSessionLocal

    # Load credentials from core DB (scraper uses gjo_se_com DB)
    async with session_factory() as core_db:
        fm_creds = await get_admin_credential_service().get_credentials(core_db, service="freelancermap")

    async with session_factory() as db:
        scraper = _build_scraper(db)
        _ = await scraper.run(
            username=fm_creds.get("login_username") or None,
            password=fm_creds.get("login_password") or None,
        )
