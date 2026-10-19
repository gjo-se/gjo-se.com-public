"""Hunter.io API client for email finding, verification, and company enrichment.

Provides async methods for the Hunter.io Email Finder, Email Verifier,
Domain Search, and Company Enrichment APIs.
Used by the CRM enrichment services.

API docs: https://hunter.io/api-documentation/v2
"""

from __future__ import annotations

from dataclasses import dataclass, field
from http import HTTPStatus
from typing import Any, Protocol

import httpx
import structlog

logger = structlog.get_logger(__name__)

HUNTER_BASE_URL = "https://api.hunter.io/v2"

_ERROR_INSUFFICIENT_CREDITS = "insufficient_credits"
_ERROR_UNAUTHORIZED = "unauthorized"
_ERROR_API = "api_error"


@dataclass
class CompanyEnrichmentData:
    """Structured result from the Hunter.io Company Enrichment endpoint.

    Attributes:
        website: Company website domain (e.g. ``example.com``).
        industry: Industry classification.
        company_size: Size category (e.g. ``1-10``, ``51-200``).
        founded_year: Year the company was founded.
        linkedin_url: LinkedIn company profile URL.
        description: Company description text.
        tags: List of technology/category tags.
    """

    website: str | None = None
    industry: str | None = None
    company_size: str | None = None
    founded_year: int | None = None
    linkedin_url: str | None = None
    description: str | None = None
    tags: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class HunterError:
    """Structured description of a handled Hunter.io request failure.

    Attributes:
        code: Normalised reason – ``insufficient_credits`` (HTTP 429, plan
            quota exhausted), ``unauthorized`` (HTTP 401) or ``api_error``
            (any other status / transport failure).
        status_code: Raw HTTP status code, or ``None`` for transport failures.
        detail: Human-readable message from the Hunter error body, if present.
    """

    code: str
    status_code: int | None = None
    detail: str | None = None


class HunterClient:
    """Async HTTP client for the Hunter.io API.

    Wraps the Email Finder and Email Verifier endpoints with timeout
    and error handling. Returns ``None`` on recoverable failures
    (auth, rate-limit, server error) to allow graceful degradation.
    The reason for the last handled failure is available via
    :attr:`last_error`.

    Args:
        api_key: Hunter.io API key (from settings).
        timeout: Request timeout in seconds (default 30). Hunter's
            ``/email-finder`` endpoint routinely takes ~10 s; a tighter
            timeout produced spurious ``ReadTimeout`` failures.
    """

    __slots__ = ("_api_key", "_last_error", "_timeout")

    def __init__(self, api_key: str, *, timeout: float = 30.0) -> None:
        self._api_key = api_key
        self._timeout = timeout
        self._last_error: HunterError | None = None

    @property
    def last_error(self) -> HunterError | None:
        """Error from the most recent request, or ``None`` when it succeeded."""
        return self._last_error

    # ── Public API ──────────────────────────────────────────────────────────

    async def find_email(
        self,
        first_name: str,
        last_name: str,
        domain: str,
    ) -> dict[str, Any] | None:
        """Look up an email address using the Email Finder endpoint.

        Args:
            first_name: Person's first name.
            last_name: Person's last name.
            domain: Company domain (e.g. ``example.com``).

        Returns:
            ``{"email": str, "score": int, "position": str | None,
            "linkedin_url": str | None, "phone_number": str | None,
            ...}`` if found, ``None`` otherwise.
        """
        params = {
            "first_name": first_name,
            "last_name": last_name,
            "domain": domain,
            "api_key": self._api_key,
        }
        data = await self._get("/email-finder", params=params)
        if data is None:
            return None
        result: dict[str, Any] | None = data.get("data")
        if result is None or not result.get("email"):
            logger.info(
                "Hunter email-finder: no result for %s %s @ %s",
                first_name,
                last_name,
                domain,
            )
            return None
        return result

    async def verify_email(self, email: str) -> dict[str, Any] | None:
        """Verify an email address using the Email Verifier endpoint.

        Args:
            email: Email address to verify.

        Returns:
            ``{"email": str, "score": int, "status": str, ...}`` if verifiable,
            ``None`` otherwise.
        """
        params = {"email": email, "api_key": self._api_key}
        data = await self._get("/email-verifier", params=params)
        if data is None:
            return None
        result: dict[str, Any] | None = data.get("data")
        if result is None:
            logger.info("Hunter email-verifier: no result for %s", email)
            return None
        return result

    async def domain_search(self, company_name: str) -> str | None:
        """Find the primary domain for a company using the Domain Search endpoint.

        Args:
            company_name: Company name to search for.

        Returns:
            Primary domain string (e.g. ``example.com``) if found,
            ``None`` otherwise.
        """
        params = {"company": company_name, "api_key": self._api_key}
        data = await self._get("/domain-search", params=params)
        if data is None:
            return None
        result: dict[str, Any] | None = data.get("data")
        if result is None:
            logger.info("Hunter domain-search: no result for %s", company_name)
            return None
        domain: str | None = result.get("domain")
        if not domain:
            logger.info("Hunter domain-search: no domain field for %s", company_name)
            return None
        logger.info("Hunter domain-search: %s -> %s", company_name, domain)
        return domain

    async def company_enrichment(self, domain: str) -> CompanyEnrichmentData | None:
        """Look up company profile data using the Company Enrichment endpoint.

        Args:
            domain: Company domain (e.g. ``example.com``).

        Returns:
            ``CompanyEnrichmentData`` if found, ``None`` otherwise.
        """
        params = {"domain": domain, "api_key": self._api_key}
        data = await self._get("/companies/find", params=params)
        if data is None:
            return None
        result: dict[str, Any] | None = data.get("data")
        if result is None:
            logger.info("Hunter company-enrichment: no result for %s", domain)
            return None
        enrichment = CompanyEnrichmentData(
            website=result.get("domain"),
            industry=result.get("industry"),
            company_size=result.get("size"),
            founded_year=result.get("founded_year"),
            linkedin_url=result.get("linkedin_url"),
            description=result.get("description"),
            tags=result.get("technologies") or [],
        )
        logger.info(
            "Hunter company-enrichment: enriched %s (industry=%s, size=%s)",
            domain,
            enrichment.industry,
            enrichment.company_size,
        )
        return enrichment

    async def enrich_lead(self, email: str) -> dict[str, Any] | None:
        """Enrich a lead using the Hunter Lead Enrich endpoint.

        Fills in missing fields (first_name, last_name, position, company,
        linkedin_url, phone_number) from Hunter's database using just the
        email address.

        Args:
            email: The lead's email address.

        Returns:
            ``{"first_name": str, "last_name": str, "position": str | None,
            "company": str | None, "linkedin_url": str | None,
            "phone_number": str | None, ...}`` if found, ``None`` otherwise.
        """
        params = {"email": email, "api_key": self._api_key}
        data = await self._get("/leads", params=params)
        if data is None:
            return None
        result: dict[str, Any] | None = data.get("data")
        if result is None:
            logger.info("Hunter lead-enrich: no result for %s", email)
            return None
        logger.info("Hunter lead-enrich: enriched %s", email)
        return result

    # ── Internal ────────────────────────────────────────────────────────────

    async def _get(self, path: str, *, params: dict[str, str]) -> dict[str, Any] | None:
        """Execute a GET request against the Hunter.io API.

        Returns parsed JSON on 200 and ``None`` on handled errors. On a
        handled error the reason is stored on :attr:`last_error`.

        Raises:
            httpx.RequestError: On network/transport failures (unexpected).
        """
        url = f"{HUNTER_BASE_URL}{path}"
        self._last_error = None
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            self._last_error = _build_hunter_error(exc.response)
            _log_hunter_error(path, self._last_error)
            return None
        except httpx.TimeoutException:
            self._last_error = HunterError(code=_ERROR_API, detail="request timed out")
            logger.warning("Hunter API: request timed out for %s", path, exc_info=True)
            return None
        return response.json()


class HunterClientFactory(Protocol):
    """Port for building a wired :class:`HunterClient` from an API key.

    Injected into the CRM enrichment services as a keyword parameter so those
    services never import the composition-root module ``app.crm.dependencies.crm_dependencies``
    (SOLL layer flow: ``services`` must not import ``dependencies``). The
    concrete implementation is ``app.crm.dependencies.crm_dependencies.get_hunter_client``,
    wired at the composition root; tests substitute it with a fake factory.
    """

    def __call__(self, *, api_key: str) -> HunterClient:
        """Build a :class:`HunterClient` for the given Hunter.io API key."""
        ...


def _build_hunter_error(response: httpx.Response) -> HunterError:
    """Map an HTTP error response to a structured :class:`HunterError`."""
    status_code = response.status_code
    if status_code == HTTPStatus.TOO_MANY_REQUESTS:
        code = _ERROR_INSUFFICIENT_CREDITS
    elif status_code == HTTPStatus.UNAUTHORIZED:
        code = _ERROR_UNAUTHORIZED
    else:
        code = _ERROR_API
    return HunterError(
        code=code,
        status_code=status_code,
        detail=_extract_error_detail(response),
    )


def _extract_error_detail(response: httpx.Response) -> str | None:
    """Return the ``errors[0].details`` message from a Hunter error body."""
    try:
        payload = response.json()
    except ValueError:
        return None
    if not isinstance(payload, dict):
        return None
    errors = payload.get("errors")
    if isinstance(errors, list) and errors and isinstance(errors[0], dict):
        detail = errors[0].get("details")
        if isinstance(detail, str):
            return detail
    return None


def _log_hunter_error(path: str, error: HunterError) -> None:
    """Log a handled Hunter error with its normalised reason."""
    if error.code == _ERROR_UNAUTHORIZED:
        logger.error("Hunter API: authentication failed (HTTP 401) for %s", path)
    elif error.code == _ERROR_INSUFFICIENT_CREDITS:
        logger.warning(
            "Hunter API: insufficient credits / rate-limited (HTTP 429) for %s",
            path,
        )
    else:
        logger.error("Hunter API: HTTP %s for %s", error.status_code, path)
