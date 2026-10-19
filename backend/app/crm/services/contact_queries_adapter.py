"""CRM contact adapter component: primary-contact reads via the CRM repositories.

Owns the project↔person link resolution used by the application and fbf contexts
(``list_primary_contacts``, ``get_primary_contact_ids_for_projects``,
``get_project_ids_for_person``). Mixed into :class:`CrmContactAdapter`.
"""

from __future__ import annotations

from collections.abc import Sequence

from app.crm.repositories import person_repository, project_person_repository
from app.shared.db_access.session_types import AsyncSession
from app.shared.ports.crm_contact import ContactIds, PrimaryContactRef

#: Label marking the project's single primary contact person (partial UNIQUE).
_PRIMARY_LABEL = "primary"


class CrmContactQueries:
    """Primary-contact read operations of the CRM contact port."""

    async def list_primary_contacts(self, db: AsyncSession, project_id: int) -> list[PrimaryContactRef]:
        """Return every ``primary``-labelled contact of a project (0, 1 or more)."""
        links = await project_person_repository.find_by_project(db, project_id)
        refs: list[PrimaryContactRef] = []
        for link in links:
            if link.label != _PRIMARY_LABEL:
                continue
            person = await person_repository.get_by_id_with_company(db, link.crm_person_id)
            if person is None:
                continue
            refs.append(
                PrimaryContactRef(
                    person_id=person.id,
                    first_name=person.first_name,
                    last_name=person.last_name,
                    email=person.email,
                    company_name=person.primary_company_name,
                    company_email=person.primary_company_email,
                )
            )
        return refs

    async def get_primary_contact_ids_for_projects(
        self, db: AsyncSession, project_ids: Sequence[int]
    ) -> dict[int, ContactIds]:
        """Return ``project_id -> ContactIds`` for the projects' primary contacts."""
        mapping = await person_repository.get_primary_contact_ids_for_projects(db, project_ids)
        return {
            project_id: ContactIds(person_id=person_id, company_id=company_id)
            for project_id, (person_id, company_id) in mapping.items()
        }

    async def get_project_ids_for_person(self, db: AsyncSession, crm_person_id: int) -> list[int]:
        """Return the ids of projects linked to a CRM person (any label)."""
        links = await project_person_repository.find_by_person(db, crm_person_id)
        return [link.project_id for link in links]
