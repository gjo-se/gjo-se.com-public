"""FastAPI router for CRM company endpoints (gjo_se_com).

Admin:
    GET    /companies                        – List paginated companies
    GET    /companies/count                  – Count companies
    GET    /companies/{id}                   – Retrieve a single company
    GET    /companies/{id}/persons           – List persons linked to a company
    POST   /companies                        – Create company (409 on dedup)
    PUT    /companies/{id}                   – Update company (404 / 409)
    DELETE /companies/{id}                   – Delete company (404)
    POST   /companies/{id}/extract-address   – Extract address from website imprint
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.schemas.company_schemas import (
    CompanyCreate,
    CompanyOut,
    CompanyUpdate,
)
from app.crm.schemas.person_schemas import PersonOut
from app.crm.services import company_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


# ── Admin ─────────────────────────────────────────────────────────────────────


@router.get(
    "/companies",
    response_model=list[CompanyOut],
    summary="List paginated companies (Admin)",
)
async def list_companies(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    q: str | None = Query(default=None, description="Search term for name or primary city"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=5000),
    sort_by: str = Query(
        default="name",
        description="Sort field: id, name, industry, company_size, founded_year, "
        "kununu_score, city, country, created_at, updated_at",
    ),
    sort_order: str = Query(
        default="asc",
        pattern="^(asc|desc)$",
        description="Sort direction",
    ),
) -> list[CompanyOut]:
    """Returns paginated companies with optional name/city search and primary address city/country."""
    return await company_service.list_companies(
        db,
        q=q,
        offset=offset,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/companies/count",
    summary="Count companies (Admin)",
)
async def count_companies(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    q: str | None = Query(default=None, description="Search term for name or primary city"),
) -> int:
    """Returns total count of companies, optionally filtered by name/city search."""
    return await company_service.count_companies(db, q=q)


@router.get(
    "/companies/{company_id}",
    response_model=CompanyOut,
    summary="Retrieve a single company (Admin)",
)
async def get_company(
    company_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> CompanyOut:
    """Returns a single company by ID. Raises 404 if not found."""
    return await company_service.get_company(db, company_id)


@router.get(
    "/companies/{company_id}/persons",
    response_model=list[PersonOut],
    summary="List persons linked to a company (Admin)",
)
async def list_company_persons(
    company_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[PersonOut]:
    """Returns all persons linked to a company via the canonical address path (person → address → company)."""
    await company_service.get_company(db, company_id)  # 404 if company not found
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from app.crm.models.address import Address
    from app.crm.models.person import Person

    stmt = (
        select(Person)
        .options(selectinload(Person.address))
        .join(Address, Person.address_id == Address.id)
        .where(Address.crm_company_id == company_id)
    )
    result = await db.execute(stmt)
    persons = result.scalars().all()
    return [PersonOut.model_validate(p) for p in persons]


@router.post(
    "/companies",
    response_model=CompanyOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a company (Admin)",
)
async def create_company(
    body: CompanyCreate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> CompanyOut:
    """Create a new company. Raises 409 if name already exists."""
    company = await company_service.create_company(db, body)
    await db.commit()
    return company


@router.put(
    "/companies/{company_id}",
    response_model=CompanyOut,
    summary="Update a company (Admin)",
)
async def update_company(
    company_id: int,
    body: CompanyUpdate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> CompanyOut:
    """Update an existing company by ID. Raises 404 if not found, 409 on name conflict."""
    company = await company_service.update_company(db, company_id, body)
    await db.commit()
    return company


@router.delete(
    "/companies/{company_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a company (Admin)",
)
async def delete_company(
    company_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> None:
    """Delete a company by ID. Raises 404 if not found."""
    await company_service.delete_company(db, company_id)
    await db.commit()


@router.post(
    "/companies/{source_id}/merge/{target_id}",
    response_model=CompanyOut,
    status_code=status.HTTP_200_OK,
    summary="Merge a company into another (Admin)",
    responses={
        400: {"description": "Source and target are the same"},
        404: {"description": "Company not found"},
    },
)
async def merge_companies(
    source_id: int,
    target_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> CompanyOut:
    """Merge source company into target: reassigns all dependencies, deletes source.

    Moves addresses, person-company links, and project references from source
    to target, then deletes the source company. Returns the target company.
    """
    target = await company_service.merge_companies(db, source_id, target_id)
    await db.commit()
    return target
