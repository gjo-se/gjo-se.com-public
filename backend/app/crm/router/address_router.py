"""FastAPI router for CRM company-address endpoints (gjo_se_com).

Admin:
    GET    /companies/{company_id}/addresses         – List addresses for a company
    POST   /companies/{company_id}/addresses         – Create address (company_id from URL)
    PUT    /companies/{company_id}/addresses/{id}    – Update address
    DELETE /companies/{company_id}/addresses/{id}    – Delete address (204)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.schemas.address_schemas import (
    AddressCreate,
    AddressOut,
    AddressUpdate,
)
from app.crm.services import address_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


# ── Admin ─────────────────────────────────────────────────────────────────────


@router.get(
    "/companies/{company_id}/addresses",
    response_model=list[AddressOut],
    summary="List addresses for a company (Admin)",
)
async def list_addresses(
    company_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[AddressOut]:
    """Returns all addresses for a given company."""
    addresses = await address_service.list_addresses(db, company_id)
    return [AddressOut.model_validate(a) for a in addresses]


@router.post(
    "/companies/{company_id}/addresses",
    response_model=AddressOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create an address for a company (Admin)",
)
async def create_address(
    company_id: int,
    body: AddressCreate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> AddressOut:
    """Create a new address. ``crm_company_id`` is taken from the URL path.

    Raises 404 if the parent company does not exist.
    """
    data = AddressCreate(
        crm_company_id=company_id,
        label=body.label,
        street=body.street,
        zip=body.zip,
        city=body.city,
        country=body.country,
        is_primary=body.is_primary,
    )
    address = await address_service.create_address(db, data)
    await db.commit()
    return AddressOut.model_validate(address)


@router.put(
    "/companies/{company_id}/addresses/{address_id}",
    response_model=AddressOut,
    summary="Update an address (Admin)",
)
async def update_address(
    company_id: int,
    address_id: int,
    body: AddressUpdate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> AddressOut:
    """Update an existing address. Raises 404 if not found or not owned by the company."""
    address = await address_service.get_address(db, address_id)
    if address.crm_company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found for this company",
        )
    updated = await address_service.update_address(db, address_id, body)
    await db.commit()
    return AddressOut.model_validate(updated)


@router.delete(
    "/companies/{company_id}/addresses/{address_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an address (Admin)",
)
async def delete_address(
    company_id: int,
    address_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> None:
    """Delete an address. Raises 404 if not found or not owned by the company."""
    address = await address_service.get_address(db, address_id)
    if address.crm_company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found for this company",
        )
    await address_service.delete_address(db, address_id)
    await db.commit()
