"""Contact-block checks for the CRM domain (person + canonical company)."""

from __future__ import annotations

import logging

from app.crm.repositories import person_block_repository, status_repository
from app.shared.db_access.session_types import AsyncSession
from app.shared.ports.crm_contact import ContactBlockedError

logger = logging.getLogger(__name__)

_PERSON_STATUSABLE = "crm_person"
_COMPANY_STATUSABLE = "crm_company"
_BLOCKED_STATUS_NAME = "rejected"
_DEFAULT_REASON = "Kontaktsperre aktiv"


async def assert_person_id_not_blocked(db: AsyncSession, person_id: int) -> None:
    """Load a person (incl. its canonical company) and assert it is not blocked.

    Unknown person ⇒ silent no-op (logged).

    Args:
        db: Database session.
        person_id: Primary key of the person to check.

    Raises:
        ContactBlockedError: If the person or the company is blocked.
    """
    context = await person_block_repository.get_block_context(db, person_id)
    if context is None:
        logger.warning("contact_block: person %s not found – skip check", person_id)
        return

    person_status = await status_repository.get_status_name(db, _PERSON_STATUSABLE, context.person_id)
    if person_status == _BLOCKED_STATUS_NAME:
        raise ContactBlockedError(
            scope="person",
            reason=context.contact_blocked_reason or _DEFAULT_REASON,
        )

    if context.company_id is not None:
        company_status = await status_repository.get_status_name(db, _COMPANY_STATUSABLE, context.company_id)
        if company_status == _BLOCKED_STATUS_NAME:
            raise ContactBlockedError(
                scope="company",
                name=context.company_name,
                reason=context.company_contact_blocked_reason or _DEFAULT_REASON,
            )
