"""Business logic for CRM persons (gjo_se_com)."""

from __future__ import annotations

from fastapi import HTTPException, status

from app.crm.infrastructure.hunter_client import HunterClientFactory
from app.crm.repositories import person_repository
from app.crm.schemas.person_schemas import PersonCreate, PersonOut, PersonUpdate
from app.shared.db_access.session_types import AsyncSession


async def get_person(db: AsyncSession, person_id: int) -> PersonOut:
    """Return a person by ID or raise 404.

    Args:
        db: Database session.
        person_id: UUID of the person.

    Returns:
        Person DTO.

    Raises:
        HTTPException 404: Person not found.
    """
    person = await person_repository.get_by_id(db, person_id)
    if person is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Person not found",
        )
    return person


async def list_persons(
    db: AsyncSession,
    q: str | None = None,
    offset: int = 0,
    limit: int = 20,
    sort_by: str = "last_name",
    sort_order: str = "asc",
) -> list[PersonOut]:
    """Return paginated persons with linked company info, core status and dependents.

    Args:
        db: Database session.
        q: Search term matching ``first_name``, ``last_name``, ``email``, or the
           linked company ``name`` via ILIKE (optional).
        offset: Number of records to skip.
        limit: Maximum records per page.
        sort_by: Column to sort by (default ``last_name``). Supports
            ``company_name`` and ``company_city``.
        sort_order: ``asc`` or ``desc``.

    Returns:
        List of person DTOs.
    """
    return await person_repository.list_paginated(
        db,
        q=q,
        offset=offset,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
    )


async def create_person(
    db: AsyncSession,
    data: PersonCreate,
    *,
    company_domain: str | None = None,
    hunter_client_factory: HunterClientFactory | None = None,
) -> PersonOut:
    """Create a person, raising 409 on case-insensitive email conflict.

    ``email`` is optional: when it is missing the column stays ``NULL`` (no
    placeholder is fabricated), so the person is clearly marked as "email
    unknown" and can be completed manually later.

    Triggers automatic Hunter.io enrichment when ``company_domain`` is provided
    and the person has both ``first_name`` and ``last_name`` set.

    Args:
        db: Database session.
        data: Validated creation payload.
        company_domain: Optional company domain for enrichment (not persisted).
        hunter_client_factory: Composition-root provider for the Hunter client,
            forwarded to :func:`enrich_person` when enrichment is triggered.

    Returns:
        Persisted person DTO (enriched if applicable).

    Raises:
        HTTPException 409: A person with the same email already exists.
    """
    if data.email is not None:
        existing = await person_repository.get_by_email(db, data.email)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Person with this email already exists",
            )

    person = await person_repository.create(db, data)

    if company_domain:
        from app.crm.services.enrichment_service import enrich_person

        person = await enrich_person(db, person, company_domain, hunter_client_factory=hunter_client_factory)

    refreshed = await person_repository.get_by_id(db, person.id)
    return refreshed if refreshed is not None else person


async def update_person(
    db: AsyncSession,
    person_id: int,
    data: PersonUpdate,
) -> PersonOut:
    """Update a person, raising 404 if not found, 409 on email conflict.

    Only fields explicitly set in the request body are updated (PATCH-style).

    Args:
        db: Database session.
        person_id: UUID of the person to update.
        data: Partial update payload (only set fields are applied).

    Returns:
        Updated person DTO.

    Raises:
        HTTPException 404: Person not found.
        HTTPException 409: Email change conflicts with an existing person.
    """
    await get_person(db, person_id)
    update_data = data.model_dump(exclude_unset=True)

    if update_data.get("email") is not None:
        existing = await person_repository.get_by_email(db, update_data["email"])
        if existing is not None and existing.id != person_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Person with this email already exists",
            )

    updated = await person_repository.update(db, person_id, data)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Person not found",
        )
    return updated


async def count_persons(db: AsyncSession, q: str | None = None) -> int:
    """Return the total count of persons, optionally filtered by search.

    Args:
        db: Database session.
        q: Search term matching ``first_name``, ``last_name``, ``email``, or the
           linked company ``name`` via ILIKE (optional).

    Returns:
        Total number of matching persons.
    """
    return await person_repository.count(db, q=q)


async def delete_person(db: AsyncSession, person_id: int) -> None:
    """Delete a person, raising 404 if not found.

    Args:
        db: Database session.
        person_id: UUID of the person to delete.

    Raises:
        HTTPException 404: Person not found.
    """
    await get_person(db, person_id)
    await person_repository.delete(db, person_id)
