"""FastAPI router for the CRM company address-extraction endpoint (gjo_se_com).

Admin:
    POST /companies/{id}/extract-address – Extract an address from the
    company's website imprint via the LLM-backed extraction service.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.repositories import address_repository, company_repository
from app.crm.schemas.address_schemas import AddressOut
from app.crm.services import address_service
from app.crm.services.address_extraction_service import extract_address_from_website
from app.shared.db_access.session import get_db, get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


@router.post(
    "/companies/{company_id}/extract-address",
    response_model=None,
    status_code=status.HTTP_201_CREATED,
    summary="Extract company address from website imprint (Admin)",
    responses={
        200: {"description": "No address found or already exists"},
        404: {"description": "Company not found"},
        422: {"description": "Company has no website"},
    },
)
async def extract_company_address(
    company_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    core_db: AsyncSession = Depends(get_db),
) -> AddressOut | JSONResponse:
    """Extract a company address from its website imprint via LLM."""
    company = await company_repository.get_by_id(db, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")

    if not company.website:
        raise HTTPException(status_code=422, detail="Company has no website")

    existing = await address_repository.list_by_company(db, company_id)
    if any(address_service.has_address_data(a) for a in existing):
        return JSONResponse(
            status_code=200,
            content={"message": "Adresse existiert bereits."},
        )

    address = await extract_address_from_website(db=db, core_db=core_db, company=company)

    if address is None:
        return JSONResponse(
            status_code=200,
            content={"message": "Keine Adresse im Impressum gefunden oder Adresse existiert bereits."},
        )

    await db.commit()
    return AddressOut.model_validate(address)
