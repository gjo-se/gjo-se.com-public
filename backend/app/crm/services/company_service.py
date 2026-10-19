"""Business logic for CRM companies (gjo_se_com)."""

from __future__ import annotations

import structlog
from fastapi import HTTPException, status

from app.crm.repositories import company_repository
from app.crm.schemas.company_schemas import CompanyCreate, CompanyOut, CompanyUpdate
from app.shared.db_access.session_types import AsyncSession

logger = structlog.get_logger(__name__)


async def get_company(db: AsyncSession, company_id: int) -> CompanyOut:
    """Return a company by ID or raise 404.

    Args:
        db: Database session.
        company_id: UUID of the company.

    Returns:
        Company DTO.

    Raises:
        HTTPException 404: Company not found.
    """
    company = await company_repository.get_by_id(db, company_id)
    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )
    return company


async def list_companies(
    db: AsyncSession,
    q: str | None = None,
    offset: int = 0,
    limit: int = 20,
    sort_by: str = "name",
    sort_order: str = "asc",
) -> list[CompanyOut]:
    """Return paginated companies with primary address, dependency flag and core status.

    Args:
        db: Database session.
        q: Search term matching ``name`` or the primary address ``city`` via
            ILIKE (optional).
        offset: Number of records to skip.
        limit: Maximum records per page.
        sort_by: Column to sort by (default ``name``).
        sort_order: ``asc`` or ``desc``.

    Returns:
        List of company DTOs.
    """
    return await company_repository.list_paginated(
        db,
        q=q,
        offset=offset,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
    )


async def create_company(db: AsyncSession, data: CompanyCreate) -> CompanyOut:
    """Create a company, raising 409 on case-insensitive name conflict.

    Args:
        db: Database session.
        data: Validated creation payload.

    Returns:
        Persisted company DTO.

    Raises:
        HTTPException 409: A company with this name already exists.
    """
    existing = await company_repository.get_by_name_ci(db, data.name)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Company with this name already exists",
        )
    return await company_repository.create(db, data)


async def update_company(
    db: AsyncSession,
    company_id: int,
    data: CompanyUpdate,
) -> CompanyOut:
    """Update a company, raising 404 if not found, 409 on name conflict.

    Only fields explicitly set in the request body are updated (PATCH-style).

    Args:
        db: Database session.
        company_id: UUID of the company to update.
        data: Partial update payload (only set fields are applied).

    Returns:
        Updated company DTO.

    Raises:
        HTTPException 404: Company not found.
        HTTPException 409: Name change conflicts with an existing company.
    """
    await get_company(db, company_id)
    update_data = data.model_dump(exclude_unset=True)

    if update_data.get("name") is not None:
        existing = await company_repository.get_by_name_ci(db, update_data["name"])
        if existing is not None and existing.id != company_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Company with this name already exists",
            )

    updated = await company_repository.update(db, company_id, data)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )
    return updated


async def count_companies(db: AsyncSession, q: str | None = None) -> int:
    """Return the total count of companies, optionally filtered by name search.

    Args:
        db: Database session.
        q: Search term matching ``name`` via ILIKE (optional).

    Returns:
        Total number of matching companies.
    """
    return await company_repository.count(db, q=q)


async def delete_company(db: AsyncSession, company_id: int) -> None:
    """Delete a company, raising 404 if not found.

    Args:
        db: Database session.
        company_id: UUID of the company to delete.

    Raises:
        HTTPException 404: Company not found.
    """
    await get_company(db, company_id)
    await company_repository.delete(db, company_id)


async def merge_companies(
    db: AsyncSession,
    source_id: int,
    target_id: int,
) -> CompanyOut:
    """Merge source company into target – reassign all dependencies, then delete source.

    Reassigns addresses (moved addresses are demoted to ``is_primary=False``;
    the target keeps exactly one primary address); persons linked via the
    canonical path are automatically reassigned with their addresses.

    Args:
        db: Database session.
        source_id: Company to be merged (will be deleted).
        target_id: Company to keep.

    Returns:
        Target company DTO.

    Raises:
        HTTPException 400: source_id equals target_id.
        HTTPException 404: Either company not found.
    """
    if source_id == target_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source and target must be different companies",
        )

    source = await get_company(db, source_id)
    target = await get_company(db, target_id)

    logger.info(
        "Merging company %s (%s) → %s (%s)",
        source.id,
        source.name,
        target.id,
        target.name,
    )

    merged = await company_repository.merge(db, source_id, target_id)

    logger.info(
        "Merge complete: company %s → %s",
        source.name,
        target.name,
    )
    return merged
