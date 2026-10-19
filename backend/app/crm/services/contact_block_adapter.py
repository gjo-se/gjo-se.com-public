"""CRM contact adapter component: contact-block assertion.

Owns ``assert_person_not_blocked`` delegating to the CRM contact-block service.
Mixed into :class:`CrmContactAdapter`.
"""

from __future__ import annotations

from app.crm.services import contact_block_service
from app.shared.db_access.session_types import AsyncSession


class CrmContactBlockChecks:
    """Contact-block check operation of the CRM contact port."""

    async def assert_person_not_blocked(self, db: AsyncSession, person_id: int) -> None:
        """Assert that the person (and its canonical company) is not contact-blocked.

        Unknown persons are a silent no-op.
        """
        await contact_block_service.assert_person_id_not_blocked(db, person_id)
