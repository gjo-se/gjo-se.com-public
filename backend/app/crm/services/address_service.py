"""Business logic for CRM addresses (gjo_se_com)."""

from __future__ import annotations

from fastapi import HTTPException, status

from app.crm.repositories import (
    address_repository,
    company_repository,
)
from app.crm.schemas.address_schemas import AddressCreate, AddressOut, AddressUpdate
from app.shared.db_access.session_types import AsyncSession


def has_address_data(address: AddressOut) -> bool:
    """True when the address carries at least one real address component.

    Enrichment creates a minimal ``Primary`` address (no street/zip/city) only
    to bind a person via the canonical ``person → address → company`` path.
    Such shell addresses must not be treated as "address exists".
    """
    return any((address.street, address.zip, address.city, address.country))


async def _demote_primary_for_company(db: AsyncSession, company_id: int) -> None:
    """Set the existing primary address for a company to ``False``.

    Used before creating or promoting a new primary address.

    Args:
        db: Database session.
        company_id: UUID of the company whose primary address is demoted.
    """
    await address_repository.demote_primary_for_company(db, company_id)


async def get_address(db: AsyncSession, address_id: int) -> AddressOut:
    """Return an address by ID or raise 404.

    Args:
        db: Database session.
        address_id: UUID of the address.

    Returns:
        Address DTO.

    Raises:
        HTTPException 404: Address not found.
    """
    address = await address_repository.get_by_id(db, address_id)
    if address is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found",
        )
    return address


async def list_addresses(
    db: AsyncSession,
    company_id: int,
    sort_by: str = "created_at",
    sort_order: str = "asc",
) -> list[AddressOut]:
    """Return all addresses for a given company.

    Args:
        db: Database session.
        company_id: UUID of the parent company.
        sort_by: Column to sort by (default ``created_at``).
        sort_order: ``asc`` or ``desc``.

    Returns:
        List of matching address DTOs.
    """
    return await address_repository.list_by_company(
        db,
        company_id,
        sort_by=sort_by,
        sort_order=sort_order,
    )


async def create_address(db: AsyncSession, data: AddressCreate) -> AddressOut:
    """Create an address, raising 404 if the parent company does not exist.

    If ``is_primary`` is ``True``, any existing primary address for the same
    company is demoted (set to ``False``).

    Args:
        db: Database session.
        data: Validated creation payload.

    Returns:
        Persisted address DTO.

    Raises:
        HTTPException 404: Parent company not found.
    """
    company = await company_repository.get_by_id(db, data.crm_company_id)
    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    if data.is_primary:
        await _demote_primary_for_company(db, data.crm_company_id)

    return await address_repository.create(db, data)


async def update_address(
    db: AsyncSession,
    address_id: int,
    data: AddressUpdate,
) -> AddressOut:
    """Update an address, raising 404 if not found.

    Only fields explicitly set in the request body are updated (PATCH-style).
    When ``is_primary`` is set to ``True``, the existing primary address
    for the same company is demoted.

    Args:
        db: Database session.
        address_id: UUID of the address to update.
        data: Partial update payload (only set fields are applied).

    Returns:
        Updated address DTO.

    Raises:
        HTTPException 404: Address not found.
    """
    address = await get_address(db, address_id)
    update_data = data.model_dump(exclude_unset=True)

    if update_data.get("is_primary") is True:
        await _demote_primary_for_company(db, address.crm_company_id)

    updated = await address_repository.update(db, address_id, data)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found",
        )
    return updated


async def delete_address(db: AsyncSession, address_id: int) -> None:
    """Delete an address, raising 404 if not found or 409 on the last one.

    Persons linked to the deleted address are re-linked to another remaining
    address of the same company (preferred: a primary one) before deletion.
    Company membership is derived via ``person → address → company``, so without
    this the persons would be silently detached.

    If the address is the company's **last** address and persons are still
    linked to it, the delete is rejected (409): removing it would orphan those
    persons (FK ``ON DELETE SET NULL``). A replacement address must be created
    first.

    Args:
        db: Database session.
        address_id: UUID of the address to delete.

    Raises:
        HTTPException 404: Address not found.
        HTTPException 409: Last address with linked persons.
    """
    result = await address_repository.delete_with_relink(db, address_id)

    if result.status == "not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found",
        )
    if result.status == "blocked_last_with_persons":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Letzte Adresse der Firma kann nicht gelöscht werden – "
                f"{result.person_count} verknüpfte Person(en). Bitte zuerst eine "
                f"weitere Adresse anlegen oder die Person(en) entfernen."
            ),
        )
