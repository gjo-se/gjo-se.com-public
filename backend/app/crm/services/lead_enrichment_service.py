"""Lead-enrichment service: Hunter.io Lead Enrich based on an existing email.

Enriches an already persisted person using the Hunter Lead Enrich lookup keyed
on the person's email. Only NULL fields are filled – existing data is never
overwritten. Extracted from ``enrichment_service`` as an independent,
email-anchored enrichment component.
"""

from __future__ import annotations

import structlog

from app.crm.infrastructure.hunter_client import HunterClient, HunterClientFactory
from app.crm.repositories import person_repository
from app.crm.schemas.person_schemas import PersonOut
from app.shared.config.config import settings
from app.shared.db_access.session_types import AsyncSession

logger = structlog.get_logger(__name__)


async def enrich_person_by_email(
    db: AsyncSession,
    person: PersonOut,
    *,
    hunter_client_factory: HunterClientFactory | None = None,
) -> bool:
    """Enrich an existing person using Hunter Lead Enrich (based on email).

    Only fills fields that are currently NULL – existing data is never
    overwritten. Sets ``enrichment_source = "hunter_lead"`` on success.

    Args:
        db: Database session.
        person: The person to enrich as DTO (must have an email).
        hunter_client_factory: Composition-root provider that builds the
            :class:`HunterClient` from the API key. Defaults to the module-level
            ``HunterClient`` when omitted.

    Returns:
        ``True`` if at least one field was enriched, ``False`` otherwise.
    """
    if not person.email:
        logger.debug("Lead enrich skipped: no email for person %s", person.id)
        return False

    api_key = settings.HUNTER_API_KEY
    if not api_key:
        logger.warning("Lead enrich skipped: HUNTER_API_KEY not configured")
        return False

    client = (hunter_client_factory or HunterClient)(api_key=api_key)
    result = await client.enrich_lead(person.email)

    if result is None:
        logger.info("Lead enrich: no result for %s", person.email)
        return False

    enriched = await person_repository.apply_lead_enrich_result(db, person.id, result)
    if enriched:
        logger.info("Lead enrich successful for %s", person.email)
    else:
        logger.debug("Lead enrich: no new data for %s", person.email)
    return enriched
