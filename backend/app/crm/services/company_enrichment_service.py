"""Company Enrichment Service: finds/creates companies and enriches via Hunter.io."""

from __future__ import annotations

from collections.abc import Callable
from typing import Literal

import structlog

from app.crm.infrastructure.hunter_client import (
    CompanyEnrichmentData,
    HunterClient,
    HunterClientFactory,
    HunterError,
)
from app.crm.repositories import (
    company_domain_repository,
    company_name_repository,
    company_repository,
)
from app.crm.schemas.company_schemas import CompanyCreate, CompanyOut
from app.crm.schemas.enrich_schemas import CompanyEnrichRequest
from app.shared.config.config import settings
from app.shared.db_access.session_types import AsyncSession

logger = structlog.get_logger(__name__)


async def enrich_company(
    db: AsyncSession,
    request: CompanyEnrichRequest,
    skip_enrichment: bool = False,
    *,
    hunter_client_factory: HunterClientFactory | None = None,
    on_error: Callable[[HunterError], None] | None = None,
) -> CompanyOut:
    """Find or create a company by name and enrich it with Hunter.io data.

    Flow:
        1. Resolve ``domain`` (request value, else Hunter.io Domain Search).
        2. Match cascade: domain → exact name (ci) → normalised name.
        3. If no match → create new company with just the name.
        4. Look up company profile via Hunter.io Company Enrichment.
        5. Map enrichment fields onto the company (fill-only).
        6. Persist the updated company.

    Hunter.io errors result in graceful degradation: the company is still
    created or updated, just without enrichment data.

    Args:
        db: Database session.
        request: Enrichment request with ``company_name`` and optional ``domain``.
        skip_enrichment: When ``True``, no Hunter.io call is made at all – the
            domain is taken only from the request and the find-or-create part
            still runs.
        hunter_client_factory: Composition-root provider that builds the
            :class:`HunterClient` from the API key. Defaults to the module-level
            ``HunterClient`` when omitted.
        on_error: Optional callback invoked with the handled :class:`HunterError`
            when a Hunter call fails (e.g. exhausted plan quota).

    Returns:
        The company DTO (potentially enriched).
    """
    # ── 1. Resolve domain if not provided ─────────────────────────────────
    domain, client = await _resolve_domain(
        request,
        skip_enrichment=skip_enrichment,
        hunter_client_factory=hunter_client_factory,
    )
    _report_hunter_error(client, on_error)

    # ── 2. Find or create company (match cascade, first hit wins) ──────────
    company, is_new = await _find_or_create_company(db, request.company_name, domain, request.company_type)

    # ── 3. Enrich via Hunter.io ───────────────────────────────────────────
    if not skip_enrichment and client is not None and domain:
        enrichment = await _safe_company_enrichment(client, domain)
        _report_hunter_error(client, on_error)
        if enrichment is not None:
            enriched = await company_repository.apply_enrichment(db, company.id, enrichment)
            if enriched is not None:
                company = enriched

    # ── 4. Search-URL placeholders ────────────────────────────────────────
    defaulted = await company_repository.apply_search_url_defaults(db, company.id)
    if defaulted is not None:
        company = defaulted

    logger.info(
        "Company enrichment complete for %s (new=%s, domain=%s)",
        request.company_name,
        is_new,
        domain,
    )
    return company


async def _resolve_domain(
    request: CompanyEnrichRequest,
    skip_enrichment: bool = False,
    hunter_client_factory: HunterClientFactory | None = None,
) -> tuple[str | None, HunterClient | None]:
    """Resolve the company domain (request value, else Hunter.io search).

    Returns the resolved domain and a Hunter client (``None`` when no API key
    is configured). When ``skip_enrichment`` is ``True``, no Hunter client is
    created and the domain is taken only from the request.
    """
    domain = request.domain
    if skip_enrichment:
        return domain, None

    api_key = settings.HUNTER_API_KEY
    if not api_key:
        logger.warning("Company enrichment skipped: HUNTER_API_KEY not configured")
        return domain, None

    client = (hunter_client_factory or HunterClient)(api_key=api_key)
    if not domain:
        try:
            domain = await client.domain_search(request.company_name)
        except Exception:
            logger.exception("Domain search failed for %s", request.company_name)
            domain = None
    return domain, client


def _report_hunter_error(
    client: HunterClient | None,
    on_error: Callable[[HunterError], None] | None,
) -> None:
    """Forward a handled Hunter failure to the optional callback."""
    if client is None or on_error is None:
        return
    error = client.last_error
    if error is not None:
        on_error(error)


async def _find_or_create_company(
    db: AsyncSession,
    company_name: str,
    domain: str | None,
    company_type: Literal["endcustomer", "broker"] | None = None,
) -> tuple[CompanyOut, bool]:
    """Match a company (domain → name ci → normalised name) or create it.

    ``company_type`` is applied only on creation (an existing company keeps its
    value).

    Returns the company DTO and whether it was newly created.
    """
    company = None
    if domain:
        company = await company_domain_repository.get_by_domain_ci(db, domain)
    if company is None:
        company = await company_repository.get_by_name_ci(db, company_name)
    if company is None:
        company = await company_name_repository.get_by_normalized_name(db, company_name)
    if company is not None:
        return company, False

    created = await company_repository.create(
        db,
        CompanyCreate(name=company_name, company_type=company_type),
    )
    logger.info("Created new company: %s (id=%s)", company_name, created.id)
    return created, True


async def _safe_company_enrichment(client: HunterClient, domain: str) -> CompanyEnrichmentData | None:
    """Call Hunter company enrichment, degrading gracefully on errors."""
    try:
        return await client.company_enrichment(domain)
    except Exception:
        logger.exception("Company enrichment failed for domain=%s", domain)
        return None
