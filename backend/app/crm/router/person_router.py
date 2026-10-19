"""FastAPI router for CRM person endpoints (gjo_se_com).

Admin:
    GET    /persons           – List paginated persons
    GET    /persons/count     – Count persons
    GET    /persons/{id}      – Retrieve a single person
    POST   /persons           – Create person (409 on email dedup)
    PUT    /persons/{id}      – Update person (404 / 409)
    DELETE /persons/{id}      – Delete person (404)
    POST   /persons/{id}/enrich – Enrich existing person via Hunter Lead Enrich
    POST   /enrich            – Create + enrich person via Hunter.io (project flow)
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.dependencies.crm_dependencies import get_hunter_client
from app.crm.schemas.enrich_schemas import EnrichRequest
from app.crm.schemas.person_schemas import (
    PersonCreate,
    PersonOut,
    PersonUpdate,
)
from app.crm.services import person_service
from app.crm.services.enrichment_service import enrich_person
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


# ── Admin ─────────────────────────────────────────────────────────────────────


@router.get(
    "/persons",
    response_model=list[PersonOut],
    summary="List paginated persons (Admin)",
)
async def list_persons(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    q: str | None = Query(default=None, description="Search term for name, email, or company"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=5000),
    sort_by: str = Query(
        default="last_name",
        description="Sort field: id, first_name, last_name, email, phone, role, "
        "department, company_name, company_city, created_at, updated_at",
    ),
    sort_order: str = Query(
        default="asc",
        pattern="^(asc|desc)$",
        description="Sort direction",
    ),
) -> list[PersonOut]:
    """Returns paginated persons with optional search and linked company info."""
    return await person_service.list_persons(
        db,
        q=q,
        offset=offset,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/persons/count",
    summary="Count persons (Admin)",
)
async def count_persons(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    q: str | None = Query(default=None, description="Search term for name, email, or company"),
) -> int:
    """Returns total count of persons, optionally filtered by name/email/company search."""
    return await person_service.count_persons(db, q=q)


@router.post(
    "/persons",
    response_model=PersonOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a person (Admin)",
)
async def create_person(
    body: PersonCreate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> PersonOut:
    """Create a new person. Raises 409 if email already exists.

    If ``company_domain`` is provided and person has a name, triggers
    Hunter.io enrichment automatically.
    """
    person = await person_service.create_person(
        db,
        body,
        company_domain=body.company_domain,
        hunter_client_factory=get_hunter_client,
    )
    await db.commit()
    return person


@router.put(
    "/persons/{person_id}",
    response_model=PersonOut,
    summary="Update a person (Admin)",
)
async def update_person(
    person_id: int,
    body: PersonUpdate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> PersonOut:
    """Update an existing person by ID. Raises 404 if not found, 409 on email conflict."""
    person = await person_service.update_person(db, person_id, body)
    await db.commit()
    return person


@router.delete(
    "/persons/{person_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a person (Admin)",
)
async def delete_person(
    person_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> None:
    """Delete a person by ID. Raises 404 if not found."""
    await person_service.delete_person(db, person_id)
    await db.commit()


# ── Enrichment ────────────────────────────────────────────────────────────────


@router.post(
    "/persons/enrich",
    response_model=PersonOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create and enrich a person via Hunter.io (Admin)",
)
async def enrich_person_endpoint(
    body: EnrichRequest,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> PersonOut:
    """Create a person with ``email=NULL``, then enrich via Hunter.io.

    Used by the project-detail "Kontaktdaten besorgen" button.
    Returns the person with the email and confidence_score found by Hunter
    (``email`` stays ``NULL`` when Hunter cannot resolve a real address).
    """
    create_data = PersonCreate(
        first_name=body.first_name,
        last_name=body.last_name,
    )
    person = await person_service.create_person(db, create_data, hunter_client_factory=get_hunter_client)
    await db.flush()

    person = await enrich_person(db, person, body.company_domain, hunter_client_factory=get_hunter_client)
    await db.commit()

    return person
