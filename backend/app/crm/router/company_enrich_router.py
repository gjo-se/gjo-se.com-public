"""FastAPI router for company enrichment endpoint (gjo_se_com).

Admin:
    POST /companies/enrich  – Enrich a company via Hunter.io
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.dependencies.crm_dependencies import get_hunter_client
from app.crm.schemas.company_schemas import CompanyOut
from app.crm.schemas.enrich_schemas import CompanyEnrichRequest
from app.crm.services import company_enrichment_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


# ── Admin ─────────────────────────────────────────────────────────────────────


@router.post(
    "/companies/enrich",
    response_model=CompanyOut,
    status_code=status.HTTP_200_OK,
    summary="Enrich a company via Hunter.io (Admin)",
)
async def enrich_company(
    body: CompanyEnrichRequest,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> CompanyOut:
    """Find or create a company by name and enrich it with Hunter.io data.

    If ``domain`` is not provided, it is resolved via the Hunter.io
    Domain Search endpoint first. Then the Company Enrichment endpoint
    is called to fetch industry, size, founded year, LinkedIn URL,
    description and tags.

    Hunter.io failures are handled gracefully: the company is still
    created or updated, just without enrichment data.
    """
    company = await company_enrichment_service.enrich_company(
        db,
        body,
        hunter_client_factory=get_hunter_client,
    )
    await db.commit()
    return CompanyOut.model_validate(company)
