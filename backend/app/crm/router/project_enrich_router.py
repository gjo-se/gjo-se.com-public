"""FastAPI router for the project enrichment orchestration endpoint (gjo_se_com).

Admin:
    POST /crm/project-enrich/{id}/enrich-contacts  – One-click enrichment pipeline
"""

from fastapi import APIRouter, Body, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.dependencies.crm_dependencies import get_hunter_client
from app.crm.schemas.project_enrich_schemas import (
    ProjectEnrichRequest,
    ProjectEnrichResponse,
)
from app.crm.services.project_enrichment_service import (
    enrich_project_contacts,
)
from app.shared.db_access.session import get_gjo_se_db
from app.shared.ports.project import ProjectCatalogPort, get_project_catalog_port
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


# ── Admin ─────────────────────────────────────────────────────────────────────


@router.post(
    "/{project_id}/enrich-contacts",
    response_model=ProjectEnrichResponse,
    status_code=status.HTTP_200_OK,
    summary="Enrich project contacts in one click (Admin)",
)
async def enrich_project(
    project_id: int,
    _: AdminUser,
    body: ProjectEnrichRequest = Body(default_factory=ProjectEnrichRequest),
    db: AsyncSession = Depends(get_gjo_se_db),
    catalog: ProjectCatalogPort = Depends(get_project_catalog_port),
) -> ProjectEnrichResponse:
    """Orchestrate Company + Person enrichment from project data.

    Reads ``company_name`` and ``contact_name`` from the project,
    finds or creates the corresponding CRM entities, enriches them
    via Hunter.io, and links them together.

    The request body is optional: without it the endpoint behaves exactly
    as before. With ``crm_company_id``/``crm_person_id`` the caller pins
    existing entities, and ``skip_hunter`` avoids any Hunter.io call.

    Requires ``company_name``/``contact_name`` on the project unless the
    corresponding id is provided (422 otherwise). Hunter.io failures are
    handled gracefully.
    """
    result = await enrich_project_contacts(
        db,
        project_id,
        request=body,
        catalog=catalog,
        hunter_client_factory=get_hunter_client,
    )

    await db.commit()

    return ProjectEnrichResponse(
        company=result["company"],
        person=result["person"],
        project_crm_person_link_id=result["project_crm_person_link_id"],
        enrichment_details=result["enrichment_details"],
    )
