"""CRM contact adapter component: endcustomer contact onboarding.

Owns ``create_endcustomer_contact`` (find-or-create the CRM company with
enrichment, then the address → person → ``project_person`` chain). Mixed into
:class:`CrmContactAdapter`; the Hunter client factory is set by the adapter.
"""

from __future__ import annotations

from app.crm.infrastructure.hunter_client import HunterClientFactory
from app.crm.repositories import address_repository, person_repository, project_person_repository
from app.crm.schemas.address_schemas import AddressCreate
from app.crm.schemas.enrich_schemas import CompanyEnrichRequest
from app.crm.schemas.person_schemas import PersonCreate
from app.crm.schemas.project_person_schemas import ProjectPersonCreate
from app.crm.services.company_enrichment_service import enrich_company
from app.shared.db_access.session_types import AsyncSession
from app.shared.ports.crm_contact import EndcustomerContactRef

#: Label marking a project's endcustomer contact person.
_ENDCUSTOMER_LABEL = "endcustomer_contact"


class CrmContactOnboarding:
    """Endcustomer contact onboarding operation of the CRM contact port.

    Args:
        hunter_client_factory: Composition-root provider used to build the
            Hunter.io client for endcustomer company enrichment.
    """

    def __init__(self, hunter_client_factory: HunterClientFactory) -> None:
        self._hunter_client_factory = hunter_client_factory

    async def create_endcustomer_contact(
        self,
        db: AsyncSession,
        *,
        project_id: int,
        company_name: str,
        domain: str | None,
    ) -> EndcustomerContactRef:
        """Onboard an endcustomer company as a project contact.

        Find-or-creates the CRM company (with enrichment) and creates the
        address → person → ``project_person`` chain for the given project.

        The caller owns the transaction and must commit.
        """
        company = await enrich_company(
            db,
            CompanyEnrichRequest(company_name=company_name, domain=domain),
            hunter_client_factory=self._hunter_client_factory,
        )

        address = await address_repository.create(
            db,
            AddressCreate(crm_company_id=company.id, label="Hauptsitz", is_primary=True),
        )

        person = await person_repository.create(
            db,
            PersonCreate(email=None, last_name=company_name, role="Ansprechpartner", address_id=address.id),
        )

        await project_person_repository.create(
            db,
            ProjectPersonCreate(project_id=project_id, crm_person_id=person.id, label=_ENDCUSTOMER_LABEL),
        )

        return EndcustomerContactRef(company_id=company.id, person_id=person.id)
