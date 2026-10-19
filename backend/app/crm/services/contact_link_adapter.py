"""CRM contact adapter component: project-link move.

Owns ``move_project_links`` delegating to the CRM project-person service. Mixed
into :class:`CrmContactAdapter`.
"""

from __future__ import annotations

from app.crm.services import project_person_service
from app.shared.db_access.session_types import AsyncSession


class CrmContactLinkMover:
    """Project-link move operation of the CRM contact port."""

    async def move_project_links(self, db: AsyncSession, from_project_id: int, to_project_id: int) -> int:
        """Re-point all CRM person links from one project to another.

        The caller owns the transaction and must commit.
        """
        return await project_person_service.move_links(db, from_project_id, to_project_id)
