"""FreelancermapScrapingService -- Scraping-Pipeline fuer freelancermap.de.

Strategie: Hybrid aus Playwright-Session und direktem AJAX-Endpoint.
    Playwright laedt die Suchergebnisseite einmalig, um die serverseitige
    PHP-Session (PHPSESSID) zu initialisieren. Danach werden alle Seiten
    ueber den AJAX-Endpoint ``/project/search/ajax`` abgerufen –
    via Playwright's APIRequestContext, die die Session-Cookies teilt.
    Alle relevanten Felder (inkl. description und skills) sind im
    AJAX-Response enthalten; Detail-Seiten werden nicht mehr geladen.

Paginierung:
    ``count`` / Eintraege-pro-Seite = Gesamtseitenzahl. Kein DOM-Parsing,
    kein Paginator-Klick erforderlich.

Delta-Lauf-Logik:
    - Cutoff = MAX(posted_at) aus der DB (leer = erster Lauf).
    - Portal-Sortierung ``sort=1`` = neueste Projekte zuerst.
    - Erstes Projekt mit posted_at <= Cutoff => sofortiger Abbruch.
      (Sort-Garantie: alle nachfolgenden Eintraege sind aelter.)
"""

import math
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import quote_plus

import structlog

from app.fbf.constants import AJAX_PAGE_SIZE, AJAX_URL, MAX_PAGES, SEARCH_URL
from app.fbf.infrastructure import scraper_status_client
from app.fbf.infrastructure.freelancermap_auth_client import ensure_auth_state
from app.fbf.infrastructure.playwright_client import PlaywrightClient
from app.fbf.repositories import (
    project_freelancer_map_repository,
)
from app.fbf.schemas.search_term_schemas import SearchTermOut
from app.fbf.services import search_term_service
from app.fbf.services.freelancermap_project_parser_service import (
    map_project_details,
    map_project_identity,
    parse_posted_at,
)
from app.shared.credential_store.dependencies.credential_store_dependencies import (
    get_admin_credential_service,
)
from app.shared.db_access.session_types import AsyncSession

logger = structlog.get_logger(__name__)


class FreelancermapScrapingService:
    """Scraper for freelancermap.de project raw data.

    Iterates all active SearchTerms and paginates the
    search results via the AJAX endpoint without a Playwright browser.
    """

    def __init__(
        self,
        db: AsyncSession,
        browser_factory: Callable[[str | None], PlaywrightClient],
    ) -> None:
        self._db = db
        self._browser_factory = browser_factory

    async def _resolve_login(self, username: str | None, password: str | None) -> tuple[str, str]:
        """Resolve login credentials (explicit args win, else DB lookup)."""
        if username is not None and password is not None:
            return username, password
        return await self._load_credentials()

    async def _resolve_cutoff(
        self,
        role: SearchTermOut,
        force_full: bool,
        since: datetime | None = None,
    ) -> datetime | None:
        """Return the delta cutoff for a role (``None`` on full run).

        Args:
            role: Active SearchTerm (``role.name`` / ``role.id``).
            force_full: If True, the cutoff is disabled (full backfill).
            since: Optional lower bound – never scrape projects older than this
                timestamp. Combined with the per-term delta cutoff via ``max``:
                for a brand-new term (no stored rows) the cutoff becomes *since*
                (bounded backfill), for an existing term the newer boundary wins
                so the normal delta is not widened.

        Returns:
            The resolved cutoff datetime or ``None``.
        """
        if force_full:
            logger.info(
                "FreelancermapScrapingService [%s]: full run -- cutoff disabled",
                role.name,
            )
            return None
        cutoff = await project_freelancer_map_repository.get_cutoff(self._db, search_term_id=role.id)
        if cutoff is not None and cutoff.tzinfo is None:
            cutoff = cutoff.replace(tzinfo=UTC)
        if since is not None:
            cutoff = since if cutoff is None else max(cutoff, since)
        if cutoff is not None:
            logger.info(
                "FreelancermapScrapingService [%s]: delta run -- cutoff=%s (since=%s)",
                role.name,
                cutoff.isoformat(),
                since.isoformat() if since is not None else "none",
            )
        else:
            logger.info(
                "FreelancermapScrapingService [%s]: first run -- no cutoff",
                role.name,
            )
        return cutoff

    async def run(
        self,
        max_results: int | None = None,
        force_full: bool = False,
        force_login: bool = False,
        username: str | None = None,
        password: str | None = None,
        since_days: int | None = None,
    ) -> int:
        """Starts a scraping run for all active SearchTerms.

        ``max_results`` applies per SearchTerm – with two active terms and

        The cutoff is calculated per SearchTerm independently.

        Authentication:
            Credentials are read from the ``admin_credential`` (core DB) entry
            for freelancermap.de (fields ``login_username`` / ``login_password``).
            If *username* and *password* are passed explicitly (preferred),
            the DB lookup is skipped – this avoids cross-DB issues since the
            scraper uses the gjo_se_com DB session.
            If the state file already exists and ``force_login=False``,
            the cached state is reused.

        Args:
            max_results: Limit per SearchTerm. None = unlimited.
                Already normalised to None by the router when 0 is passed.
            force_full: If True, the delta cutoff is ignored and all
                projects (including older ones) are stored. Useful for
                an initial backfill after first configuration.
            force_login: If True, login is always performed again –
                even if the state file already exists (e.g. after
                session expiry).
            username: Optional – explicit login username. When provided,
                ``_load_credentials()`` DB lookup is skipped.
            password: Optional – explicit login password.
            since_days: Optional lower bound in days. When set, no project
                older than ``now - since_days`` is scraped – this bounds a
                backfill for freshly added SearchTerms (which would otherwise
                crawl the full page range) while leaving the normal delta of
                existing terms untouched (see ``_resolve_cutoff``).

        Returns:
            Number of newly persisted projects (sum across all roles).
        """
        if force_full:
            logger.info("FreelancermapScrapingService: force_full=True -- ignoring cutoff")
        if max_results is not None:
            logger.info("FreelancermapScrapingService: max_results=%d (pro SearchTerm)", max_results)

        since: datetime | None = datetime.now(UTC) - timedelta(days=since_days) if since_days else None
        if since is not None:
            logger.info("FreelancermapScrapingService: since_days=%d -- lower bound %s", since_days, since.isoformat())

        _u, _p = await self._resolve_login(username, password)
        storage_state = await ensure_auth_state(username=_u, password=_p, force_login=force_login)

        search_terms = await search_term_service.list_active(self._db)
        if not search_terms:
            logger.warning("FreelancermapScrapingService: no active search terms -- aborting")
            return 0

        scraped_at = datetime.now(UTC)
        total_saved = 0

        scraper_status_client.update_scraper(roles_total=len(search_terms))

        async with self._browser_factory(storage_state) as browser:
            for idx, role in enumerate(search_terms):
                if scraper_status_client.is_aborted():
                    logger.info("FreelancermapScrapingService: abort requested – stopping role loop")
                    break
                cutoff = await self._resolve_cutoff(role, force_full, since)

                saved = await self._scrape_role(
                    browser,
                    role.name,
                    role.id,
                    cutoff,
                    scraped_at,
                    max_results=max_results,
                )
                total_saved += saved
                scraper_status_client.update_scraper(
                    roles_done=idx + 1,
                    saved=total_saved,
                )

        logger.info("FreelancermapScrapingService: finished -- %d new projects saved", total_saved)
        if total_saved > 0:
            try:
                from app.fbf.services.project_service import compute_analysis_cache

                await compute_analysis_cache(self._db)
            except Exception:
                logger.exception("Failed to refresh analysis cache after scraper run")
        return total_saved

    async def _load_credentials(self) -> tuple[str, str]:
        """Laedt und entschluesselt Login-Credentials fuer freelancermap.de aus der DB.

        Nutzt AdminCredentialService um Credentials aus der
        core.admin_credential-Tabelle zu laden statt aus portal_source.

        Returns:
            Tupel (username, password) im Klartext – beide leer wenn nicht konfiguriert.
        """
        try:
            creds = await get_admin_credential_service().get_credentials(self._db, service="freelancermap")
            username = creds.get("login_username") or ""
            password = creds.get("login_password") or ""
            return (username, password)
        except Exception:
            logger.exception("FreelancermapScrapingService: credential load failed – unauthenticated fallback")
            return ("", "")

    async def _scrape_role(  # noqa: PLR0912
        self,
        browser: PlaywrightClient,
        query: str,
        search_term_id: int,
        cutoff: datetime | None,
        scraped_at: datetime,
        max_results: int | None = None,
    ) -> int:
        """Scrapes all projects for a SearchTerm via the AJAX endpoint.

        Loads the search results page first via Playwright (session init),
        then paginates through the AJAX endpoint via Playwright APIRequestContext.

        Args:
            browser: Active PlaywrightClient context.
            query: Search term (SearchTerm.name).
            cutoff: Delta boundary for this SearchTerm (None = first run).
                scraped_at: Timestamp of the current scraping run.
                max_results: Maximum number of projects to persist for
                    this role (None = unlimited).

        Returns:
            Number of newly persisted projects.
        """
        saved = 0
        stop = False

        # Load search results page once – initialises PHPSESSID cookie
        search_url = SEARCH_URL.format(query=quote_plus(query))
        logger.info("FreelancermapScrapingService [%s]: initializing session via %s", query, search_url)
        list_page = await browser.get_page(search_url)
        await list_page.close()

        # Fetch page 1 via AJAX – returns total count for page calculation
        first_page = await self._fetch_ajax_page(browser, query, 1)
        if first_page is None:
            logger.warning("FreelancermapScrapingService [%s]: AJAX page 1 failed -- aborting", query)
            return 0

        total_count: int = int(first_page.get("count") or 0)
        first_projects: list[object] = first_page.get("projects") or []  # type: ignore[assignment]
        page_size = len(first_projects) or AJAX_PAGE_SIZE
        total_pages = min(math.ceil(total_count / page_size), MAX_PAGES)

        logger.info(
            "FreelancermapScrapingService [%s]: count=%d  pages=%d",
            query,
            total_count,
            total_pages,
        )

        scraper_status_client.update_scraper(role=query, pages_total=total_pages)

        for page_nr in range(1, total_pages + 1):
            if scraper_status_client.is_aborted():
                logger.info("FreelancermapScrapingService [%s]: abort requested – stopping", query)
                break
            scraper_status_client.update_scraper(page=page_nr)
            if page_nr == 1:
                projects = first_projects
            else:
                page_data = await self._fetch_ajax_page(browser, query, page_nr)
                if page_data is None:
                    logger.warning(
                        "FreelancermapScrapingService [%s]: AJAX page %d failed -- stopping",
                        query,
                        page_nr,
                    )
                    break
                projects = page_data.get("projects") or []  # type: ignore[assignment]

            if not projects:
                logger.info(
                    "FreelancermapScrapingService [%s]: no projects on page %d -- stopping",
                    query,
                    page_nr,
                )
                break

            logger.info(
                "FreelancermapScrapingService [%s]: page %d/%d -- %d projects",
                query,
                page_nr,
                total_pages,
                len(projects),
            )

            for raw in projects:
                if not isinstance(raw, dict):
                    continue
                result = await self._process_project(raw, cutoff, scraped_at, search_term_id=search_term_id)
                if result == "saved":
                    saved += 1
                    if max_results is not None and saved >= max_results:
                        logger.info(
                            "FreelancermapScrapingService [%s]: max_results=%d -- stopping",
                            query,
                            max_results,
                        )
                        stop = True
                        break
                elif result == "stop":
                    logger.info(
                        "FreelancermapScrapingService [%s]: cutoff on page %d -- stopping",
                        query,
                        page_nr,
                    )
                    stop = True
                    break

            if stop:
                break

        logger.info("FreelancermapScrapingService [%s]: %d new projects saved", query, saved)
        return saved

    @staticmethod
    async def _fetch_ajax_page(
        browser: PlaywrightClient,
        query: str,
        page_nr: int,
    ) -> dict[str, Any] | None:
        """Ruft eine Seite der AJAX-Suchergebnisse ab.

        Verwendet Playwright's APIRequestContext (``browser.fetch_json``),
        die die Session-Cookies des Playwright-Contexts teilt.

        Args:
            browser: Aktiver PlaywrightClient.
            query: Suchbegriff.
            page_nr: Seitennummer (1-basiert).

        Returns:
            Geparste JSON-Struktur oder None bei Fehler.
        """
        url = AJAX_URL.format(query=quote_plus(query), page=page_nr)
        try:
            data = await browser.fetch_json(url)
            if isinstance(data, dict):
                return data  # type: ignore[return-value]
            logger.warning("Unexpected AJAX response type on page %d: %s", page_nr, type(data))
            return None
        except Exception:
            logger.exception("AJAX request failed -- page=%d url=%s", page_nr, url)
            return None

    async def _process_project(
        self,
        project: dict[str, Any],
        cutoff: datetime | None,
        scraped_at: datetime,
        search_term_id: int,
    ) -> str:
        """Processes a single project dataset from the AJAX response.

        Args:
            project: Raw data dict of a project from the AJAX endpoint.
            cutoff: Delta boundary for this SearchTerm.
            scraped_at: Timestamp of the current scraping run.
            search_term_id: FK to the SearchTerm.

        Returns:
            ``"saved"``, ``"skipped"``, ``"stop"`` or ``"error"``.
        """
        identity = map_project_identity(project)
        if identity is None:
            return "error"
        external_id, url = identity

        # Dedup check: skip already-known URL
        existing = await project_freelancer_map_repository.get_by_url(self._db, url)
        if existing is not None:
            logger.debug("Already known (url): %s", url)
            return "skipped"

        # Delta check: posted_at <= cutoff → stop
        posted_at = parse_posted_at(project.get("created"), url)
        if posted_at is None:
            return "error"
        if cutoff is not None and posted_at <= cutoff:
            logger.debug("Delta stop: posted_at=%s <= cutoff=%s", posted_at, cutoff)
            return "stop"

        fields = map_project_details(project, external_id, url)
        if fields is None:
            return "error"

        _ = await project_freelancer_map_repository.create(
            self._db,
            external_id=fields.external_id,
            url=fields.url,
            title=fields.title,
            description=fields.description,
            agency=fields.agency,
            contact_name=fields.contact_name,
            city=fields.city,
            country=fields.country,
            remote_percent=fields.remote_percent,
            contract_type=fields.contract_type,
            duration=fields.duration,
            start_date=fields.start_date,
            skills=fields.skills_json,
            industry=fields.industry,
            extension_possible=fields.extension_possible,
            endcustomer=fields.endcustomer,
            search_term_id=search_term_id,
            posted_at=posted_at,
            scraped_at=scraped_at,
        )
        logger.info("Saved: %s -- %s", external_id, fields.title)
        return "saved"
