"""Async Playwright browser service for deterministic scraping.

Provides a reusable async context manager that manages a single Chromium
browser instance per scraping run with no persistent background processes.
"""

from types import TracebackType
from typing import Self

import structlog
from playwright.async_api import (
    Browser,
    BrowserContext,
    Page,
    Playwright,
    async_playwright,
)

logger = structlog.get_logger(__name__)

_WAIT_UNTIL = "load"
_GOTO_TIMEOUT_MS = 60_000  # freelancermap.de fires long-running background requests
# that prevent "networkidle" from ever firing within 30s


class PlaywrightClient:
    """Async context manager wrapping a single Chromium browser instance.

    Usage::

        # Unauthenticated (default)
        async with PlaywrightClient() as service:
            page = await service.get_page("https://example.com")
            title = await service.select(page, "h1")

        # Authenticated – reuse persisted session state
        async with PlaywrightClient(storage_state="/tmp/state.json") as service:
            data = await service.fetch_json("https://example.com/api/search?page=2")

    The browser process is started on ``__aenter__`` and stopped on
    ``__aexit__`` – even when an exception occurs.

    Args:
        storage_state: Optional path to a Playwright storage-state JSON file
            (produced by ``context.storage_state(path=...)``) that is loaded
            into the new browser context.  When ``None`` (default), the context
            starts without any pre-existing cookies or local-storage data.
    """

    def __init__(self, storage_state: str | None = None) -> None:
        self._storage_state = storage_state
        self._playwright: Playwright | None = None
        self._browser: Browser | None = None
        self._context: BrowserContext | None = None

    async def __aenter__(self) -> Self:
        """Start the Playwright browser and create a new browser context."""
        self._playwright = await async_playwright().start()
        # Fargate's /dev/shm is small (~64 MB); without these flags Chromium's
        # renderer crashes with "page crashed" during the freelancermap login.
        self._browser = await self._playwright.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        self._context = await self._browser.new_context(storage_state=self._storage_state)
        return self

    async def __aexit__(
        self,
        _exc_type: type[BaseException] | None,
        _exc_val: BaseException | None,
        _exc_tb: TracebackType | None,
    ) -> None:
        """Close the browser context and stop Playwright, regardless of exceptions."""
        if self._context is not None:
            await self._context.close()
        if self._browser is not None:
            await self._browser.close()
        if self._playwright is not None:
            await self._playwright.stop()

    async def get_page(self, url: str) -> Page:
        """Navigate to *url* and wait until the page load event fires.

        Uses ``wait_until="load"`` instead of ``"networkidle"`` because
        freelancermap.de continuously fires background requests (analytics,
        long-polling) that prevent ``networkidle`` from being reached within
        the default 30 s timeout.  All relevant DOM content is already
        available after the ``load`` event on server-rendered pages.

        Args:
            url: Full URL to load.

        Returns:
            A Playwright ``Page`` ready for querying.

        Raises:
            RuntimeError: When called outside the async context manager.
        """
        if self._context is None:
            raise RuntimeError("PlaywrightClient must be used as an async context manager.")
        page = await self._context.new_page()
        _ = await page.goto(url, wait_until=_WAIT_UNTIL, timeout=_GOTO_TIMEOUT_MS)
        return page

    async def select(self, page: Page, selector: str) -> str | None:
        """Return the ``inner_text`` of the first element matching *selector*.

        Logs a WARNING when the selector yields no result so callers can detect
        broken selectors without a hard exception.

        Args:
            page: Playwright page to query.
            selector: CSS selector string.

        Returns:
            Inner text (whitespace-stripped) or ``None`` when not found.
        """
        element = await page.query_selector(selector)
        if element is None:
            logger.warning("Selector not found: %s", selector)
            return None
        return (await element.inner_text()).strip()

    async def select_html(self, page: Page, selector: str) -> str | None:
        """Return the ``inner_html`` of the first element matching *selector*.

        Intended for rich-text fields (e.g. ``.ql-editor``) whose content must
        be converted to Markdown by the caller.

        Args:
            page: Playwright page to query.
            selector: CSS selector string.

        Returns:
            Raw inner HTML string or ``None`` when not found.
        """
        element = await page.query_selector(selector)
        if element is None:
            logger.warning("Selector not found (html): %s", selector)
            return None
        return await element.inner_html()

    async def select_all_text(self, page: Page, selector: str) -> list[str]:
        """Return the ``inner_text`` of every element matching *selector*.

        Args:
            page: Playwright page to query.
            selector: CSS selector string.

        Returns:
            List of non-empty inner-text values (whitespace-stripped).
            Returns an empty list when no elements match – no warning logged,
            as absent elements are often expected (e.g. single-page results).
        """
        elements = await page.query_selector_all(selector)
        results: list[str] = []
        for element in elements:
            text = (await element.inner_text()).strip()
            if text:
                results.append(text)
        return results

    async def select_all_attr(self, page: Page, selector: str, attr: str) -> list[str]:
        """Return all *attr* values from elements matching *selector*.

        Args:
            page: Playwright page to query.
            selector: CSS selector string.
            attr: HTML attribute name to read from each matched element.

        Returns:
            List of non-empty attribute values (elements without the attribute
            are silently skipped). Logs a WARNING when no elements match
            *selector* at all.
        """
        elements = await page.query_selector_all(selector)
        if not elements:
            logger.warning("Selector matched no elements: %s", selector)
            return []
        results: list[str] = []
        for element in elements:
            value = await element.get_attribute(attr)
            if value:
                results.append(value)
        return results

    async def fetch_json(self, url: str) -> object:
        """Makes an HTTP GET request and returns parsed JSON.

        Uses Playwright's ``APIRequestContext`` so the request shares cookies
        and headers with the browser context (same session as page requests).

        Args:
            url: Full URL to fetch.

        Returns:
            Parsed JSON object.

        Raises:
            RuntimeError: When called outside the async context manager.
        """
        if self._context is None:
            raise RuntimeError("PlaywrightClient must be used as an async context manager.")
        response = await self._context.request.get(url)
        return await response.json()
