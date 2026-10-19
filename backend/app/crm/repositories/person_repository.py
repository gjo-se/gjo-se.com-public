"""Database access for CRM person entries (gjo_se_com).

Core write side of the person aggregate (create / update / delete / re-point the
address) plus the stable consumer surface. The former god-file was split into
focused modules – plain reads and the ``_to_out`` mapper
(``person_read_repository``), the company-joined reads and sort data-tables
(``person_company_read_repository``), the owner-side seams for foreign adapters
(``person_owner_repository``) and the Hunter enrichment writes
(``person_enrichment_repository``). This module re-exports their public surface
so consumers keep importing ``app.crm.repositories.person_repository`` unchanged.

Read/write operations return ``PersonOut`` DTOs (never ORM models) so the
service layer stays free of ``app.crm.models`` imports (Achse-2: ``services`` >
``repositories``).
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.models.person import Person
from app.crm.repositories.person_company_read_repository import (
    count,
    get_by_id_with_company,
    list_paginated,
)
from app.crm.repositories.person_enrichment_repository import (
    apply_email_finder_result,
    apply_lead_enrich_result,
    apply_person_search_url_defaults,
)
from app.crm.repositories.person_owner_repository import (
    company_ids_with_persons_select,
    get_primary_contact_ids_for_projects,
    person_ids_by_address,
    reassign_address,
)
from app.crm.repositories.person_read_repository import (
    _to_out,
    find_by_name,
    find_by_name_and_company,
    get_by_email,
    get_by_email_excluding,
    get_by_id,
    list_by_address,
)
from app.crm.schemas.person_schemas import PersonCreate, PersonOut, PersonUpdate

__all__ = [
    "_to_out",
    "apply_email_finder_result",
    "apply_lead_enrich_result",
    "apply_person_search_url_defaults",
    "company_ids_with_persons_select",
    "count",
    "create",
    "delete",
    "find_by_name",
    "find_by_name_and_company",
    "get_by_email",
    "get_by_email_excluding",
    "get_by_id",
    "get_by_id_with_company",
    "get_primary_contact_ids_for_projects",
    "list_by_address",
    "list_paginated",
    "person_ids_by_address",
    "reassign_address",
    "set_address",
    "update",
]


async def create(db: AsyncSession, data: PersonCreate) -> PersonOut:
    """Builds and persists a new person, returning its DTO.

    Args:
        db: Database session.
        data: Validated creation payload.

    Returns:
        Persisted person as DTO.
    """
    person = Person(**data.model_dump(exclude={"company_domain"}))
    db.add(person)
    await db.flush()
    await db.refresh(person)
    created = await get_by_id(db, person.id)
    if created is None:
        raise RuntimeError("person vanished after create")
    return created


async def update(db: AsyncSession, person_id: int, data: PersonUpdate) -> PersonOut | None:
    """Applies a PATCH-style update to a person and returns its DTO.

    Args:
        db: Database session.
        person_id: UUID of the person to update.
        data: Partial update payload (only set fields are applied).

    Returns:
        Updated person as DTO, or ``None`` when it does not exist.
    """
    person = await db.get(Person, person_id)
    if person is None:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(person, field, value)
    await db.flush()
    return await get_by_id(db, person_id)


async def delete(db: AsyncSession, person_id: int) -> bool:
    """Removes a person by id.

    Args:
        db: Database session.
        person_id: UUID of the person to delete.

    Returns:
        True when the row was deleted; False when no row with the id exists.
    """
    person = await db.get(Person, person_id)
    if person is None:
        return False
    await db.delete(person)
    await db.flush()
    return True


async def set_address(db: AsyncSession, person_id: int, address_id: int) -> None:
    """Re-point a person's ``crm_address_id`` to the given address.

    Args:
        db: Database session.
        person_id: Person to update.
        address_id: Address id to assign.
    """
    person = await db.get(Person, person_id)
    if person is not None:
        person.address_id = address_id
        await db.flush()
