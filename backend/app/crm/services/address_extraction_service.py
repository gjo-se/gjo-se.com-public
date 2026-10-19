"""Pydantic output schema for the ``address-extraction`` LLM task.

All fields are optional – the LLM may not find every address component.
"""

import structlog
from pydantic import BaseModel, Field

from app.crm.repositories import address_repository
from app.crm.schemas.address_schemas import AddressCreate, AddressOut, AddressUpdate
from app.crm.schemas.company_schemas import CompanyOut
from app.crm.services.address_html_extraction_service import (
    MAX_HTML_TEXT_LENGTH,
    extract_text,
    fetch_url,
    find_imprint_link,
    resolve_html_text,
)
from app.crm.services.address_service import has_address_data
from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_task_executor_service

logger = structlog.get_logger(__name__)

# ── Frozen-test compatibility re-exports (historical names) ─────────────────
# ``test_address_extraction_service`` imports these from this module; the real
# implementation lives in ``address_html_extraction_service`` after the LCOM4 split.
__all__ = [
    "MAX_HTML_TEXT_LENGTH",
    "_extract_text",
    "_find_imprint_link",
]

_extract_text = extract_text
_find_imprint_link = find_imprint_link


class AddressExtractionResult(BaseModel):
    """Structured result of address extraction from an imprint page."""

    street: str | None = Field(default=None, description="Straße und Hausnummer")
    zip: str | None = Field(default=None, description="Postleitzahl")
    city: str | None = Field(default=None, description="Stadt")
    country: str | None = Field(default=None, description="Land")


async def extract_address_from_website(
    db: AsyncSession,
    core_db: AsyncSession,
    company: CompanyOut,
) -> AddressOut | None:
    """Extract a company address from its website imprint via LLM.

    Flow:
        1. Guard: website must be set.
        2. Resolve full URL (add https:// if missing).
        3. HTTP GET the main page, find imprint link.
        4. If imprint found → fetch imprint page.
        5. If not → try common imprint paths as fallback.
        6. Extract text, call ``address-extraction`` LLM task via pipeline.
        7. If result contains address fields → fill the company's existing
           empty address (enrichment shell) or create a new primary address.

    Args:
        db: Database session.
        core_db: Session used for the LLM task executor (own DB).
        company: The company (DTO) to extract an address for.

    Returns:
        ``AddressOut`` DTO (filled or newly created) if extraction
        succeeded, ``None`` otherwise.
    """
    # Guards
    if not company.website:
        logger.info("Address extraction skipped: no website for company %s", company.id)
        return None

    base_url = _resolve_base_url(company.website)

    # Step 1: Fetch main page
    main_html = await fetch_url(base_url)
    if main_html is None:
        return None

    # Steps 2–5: locate the imprint / fallback text
    html_text = await resolve_html_text(base_url, main_html)
    if not html_text:
        return None

    # Step 6: LLM extraction
    result = await _run_extraction(core_db, html_text, company.id)
    if result is None:
        return None

    # Step 7: fill the enrichment shell or create a new primary address
    return await _upsert_extracted_address(db, company.id, result)


def _resolve_base_url(website: str) -> str:
    """Return the website as an absolute URL (``https://`` prefix if missing)."""
    base_url = website.strip()
    if not base_url.startswith(("http://", "https://")):
        base_url = f"https://{base_url}"
    return base_url


async def _run_extraction(core_db: AsyncSession, html_text: str, company_id: int) -> AddressExtractionResult | None:
    """Run the ``address-extraction`` LLM task and return the parsed result.

    Returns ``None`` when the task fails or yields no address component.
    """
    exec_result = await get_task_executor_service().execute_task(
        db=core_db,
        task_key="address-extraction",
        variables={"html_text": html_text},
        trigger="button",
    )
    if not exec_result["success"]:
        logger.warning("Address extraction LLM call failed for company %s", company_id)
        return None

    result: AddressExtractionResult = exec_result["result"]
    if not any([result.street, result.zip, result.city, result.country]):
        logger.info("Address extraction: no address found for company %s", company_id)
        return None
    return result


async def _upsert_extracted_address(db: AsyncSession, company_id: int, result: AddressExtractionResult) -> AddressOut:
    """Fill the company's empty enrichment-shell address or create a new primary one.

    Filling the shell instead of creating a duplicate keeps linked persons
    attached.
    """
    existing = await address_repository.list_by_company(db, company_id)
    target = next((a for a in existing if not has_address_data(a) and a.is_primary), None) or next(
        (a for a in existing if not has_address_data(a)), None
    )

    if target is not None:
        updated = await address_repository.update(
            db,
            target.id,
            AddressUpdate(
                street=result.street,
                zip=result.zip,
                city=result.city,
                country=result.country,
                is_primary=True,
            ),
        )
        if updated is not None:
            logger.info(
                "Address extraction: filled existing address %s for company %s: %s, %s %s",
                updated.id,
                company_id,
                updated.street,
                updated.zip,
                updated.city,
            )
            return updated

    created = await address_repository.create(
        db,
        AddressCreate(
            crm_company_id=company_id,
            street=result.street,
            zip=result.zip,
            city=result.city,
            country=result.country,
            is_primary=True,
        ),
    )
    logger.info(
        "Address extraction: created address for company %s: %s, %s %s",
        company_id,
        created.street,
        created.zip,
        created.city,
    )
    return created
