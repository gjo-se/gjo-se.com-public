"""FastAPI router for CRM person detail and enrichment endpoints (gjo_se_com).

Admin:
    GET  /persons/{id}          – Retrieve a single person
    POST /persons/{id}/enrich   – Enrich an existing person via Hunter Lead Enrich
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.dependencies.crm_dependencies import get_hunter_client
from app.crm.repositories import person_repository
from app.crm.schemas.person_schemas import PersonOut
from app.crm.services.lead_enrichment_service import enrich_person_by_email
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


@router.get(
    "/persons/{person_id}",
    response_model=PersonOut,
    summary="Retrieve a single person (Admin)",
)
async def get_person(
    person_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> PersonOut:
    """Returns a single person by ID with linked company info. Raises 404 if not found."""
    person = await person_repository.get_by_id_with_company(db, person_id)
    if person is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return person


@router.post(
    "/persons/{person_id}/enrich",
    response_model=PersonOut,
    status_code=200,
    responses={404: {"description": "Person not found"}},
)
async def enrich_existing_person(
    person_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> PersonOut:
    """Enrich an existing person via Hunter Lead Enrich.

    Uses the person's email to look up missing fields (first_name, last_name,
    role, linkedin_url, phone) from Hunter's database. Only fills NULL fields –
    existing data is never overwritten.
    """
    person = await person_repository.get_by_id(db, person_id)
    if person is None:
        raise HTTPException(status_code=404, detail="Person not found")

    await enrich_person_by_email(db, person, hunter_client_factory=get_hunter_client)
    await db.commit()

    updated = await person_repository.get_by_id(db, person_id)
    return updated if updated is not None else person
