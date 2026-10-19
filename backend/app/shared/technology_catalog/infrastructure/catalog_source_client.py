"""External catalog source client – encapsulates HTTP logic, cursor pagination and response parsing."""

from __future__ import annotations

import httpx
import structlog

from app.shared.config.config import settings
from app.shared.technology_catalog.schemas.catalog_source_schemas import (
    CatalogSourcePageResponse,
    CatalogSourceTechnologyOut,
)

logger = structlog.get_logger(__name__)


class CatalogSourceError(RuntimeError):
    """Wrapper for external catalog source HTTP errors (4xx, 5xx, timeout).

    Attributes:
        status_code: HTTP status code (0 on timeout/connection error).
        message: Error message.
        url: The requested URL.
    """

    def __init__(self, status_code: int, message: str, url: str) -> None:
        self.status_code = status_code
        self.message = message
        self.url = url
        super().__init__(message)


def _base_url() -> str:
    """Return the configured catalog base URL, failing fast when it is unset.

    Returns:
        The ``TECHNOLOGY_CATALOG_BASE_URL`` setting.

    Raises:
        CatalogSourceError: When the setting is empty.
    """
    base_url = settings.TECHNOLOGY_CATALOG_BASE_URL
    if not base_url:
        raise CatalogSourceError(
            status_code=0,
            message="TECHNOLOGY_CATALOG_BASE_URL is not configured",
            url="",
        )
    return base_url


class CatalogSourceClient:
    """HTTP client for the external technology-catalog API.

    Fetches all pages of the technology catalog via cursor pagination and
    returns them as typed Pydantic models.

    Usage::

        client = CatalogSourceClient()
        try:
            technologies = await client.fetch_all_technologies()
        finally:
            await client.close()
    """

    PAGE_LIMIT = 1000

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(timeout=30.0)

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        await self._client.aclose()

    # ── Public API ─────────────────────────────────────────────────────────

    async def fetch_all_technologies(self) -> list[CatalogSourceTechnologyOut]:
        """Fetch all pages of the external technology catalog.

        Iterates over every page via cursor pagination and returns the
        entries as a flat list.

        Returns:
            All technology entries of the catalog.

        Raises:
            CatalogSourceError: On HTTP errors or timeout.
        """
        all_entries: list[CatalogSourceTechnologyOut] = []
        cursor: str | None = None
        page_num = 0

        while True:
            page_num += 1
            page = await self._fetch_page(cursor)
            all_entries.extend(page.data)
            logger.info(
                "Fetched page %d from catalog source (count=%d, total_so_far=%d)",
                page_num,
                len(page.data),
                len(all_entries),
            )

            if page.nextCursor is None:
                break
            cursor = page.nextCursor

        logger.info(
            "Catalog source sync complete – %d technologies across %d pages",
            len(all_entries),
            page_num,
        )
        return all_entries

    # ── Private ────────────────────────────────────────────────────────────

    async def _fetch_page(self, cursor: str | None) -> CatalogSourcePageResponse:
        """Fetch a single page of the catalog.

        Args:
            cursor: Cursor for the next page; ``None`` = first page.

        Returns:
            Parsed page response with ``data`` and ``nextCursor``.

        Raises:
            CatalogSourceError: On HTTP errors or timeout.
        """
        url = f"{_base_url()}?limit={self.PAGE_LIMIT}"
        if cursor is not None:
            url += f"&cursor={cursor}"

        try:
            response = await self._client.get(url)
            response.raise_for_status()
        except httpx.TimeoutException:
            logger.error("Catalog source request timed out (url=%s)", url)
            raise CatalogSourceError(
                status_code=0,
                message=f"Timeout fetching catalog source: {url}",
                url=url,
            ) from None
        except httpx.HTTPStatusError as e:
            logger.error(
                "Catalog source HTTP error %d (url=%s)",
                e.response.status_code,
                url,
            )
            raise CatalogSourceError(
                status_code=e.response.status_code,
                message=f"Catalog source API error: HTTP {e.response.status_code}",
                url=url,
            ) from e

        return CatalogSourcePageResponse.model_validate(response.json())
