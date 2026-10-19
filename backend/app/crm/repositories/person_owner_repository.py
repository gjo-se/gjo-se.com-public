"""Owner-side person seams for foreign adapters (gjo_se_com).

Owns the person-aggregate access that other aggregates' adapters need without
importing the foreign ``Person`` model themselves (``check-aggregate-boundary``):
the company projection used by ``company_repository`` and the
address re-link reads/writes used by ``address_delete_repository``, plus the
primary-contact projection used by the CRM contact port. Split out of
``person_repository`` (God-File-Refactor) so the core CRUD and the plain reads
stay separate concerns.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from sqlalchemy import select
from sqlalchemy import update as sql_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.models.address import Address
from app.crm.models.person import Person
from app.crm.models.project_person import ProjectPerson


def company_ids_with_persons_select() -> Any:
    """Owner-side projection: company ids that have at least one person.

    A person reaches its company via ``person → address → company``. The company
    list uses this projection to compute ``has_dependents`` without importing the
    foreign Person model.

    Returns:
        Select of distinct ``crm_address.crm_company_id`` values with a person.
    """
    return (
        select(Address.crm_company_id)
        .join(Person, Person.address_id == Address.id)
        .where(Address.crm_company_id.is_not(None))
    )


async def person_ids_by_address(db: AsyncSession, address_id: int) -> list[int]:
    """Owner-side read: ids of all persons whose ``crm_address_id`` is *address_id*.

    Used by the address-delete adapter (``address_delete_repository``) so that
    adapter never imports the foreign ``Person`` model.

    Args:
        db: Database session.
        address_id: Primary key of the ``crm_address`` row.

    Returns:
        List of person ids linked to the address (may be empty).
    """
    result = await db.execute(select(Person.id).where(Person.address_id == address_id))
    return list(result.scalars().all())


async def reassign_address(db: AsyncSession, person_ids: list[int], address_id: int) -> None:
    """Owner-side write: re-point the given persons to *address_id*.

    Bulk update keeping the caller free of the ``Person`` model.

    Args:
        db: Database session.
        person_ids: Persons to re-point (no-op when empty).
        address_id: Address id to assign.
    """
    if not person_ids:
        return
    await db.execute(sql_update(Person).where(Person.id.in_(person_ids)).values(address_id=address_id))
    await db.flush()


async def get_primary_contact_ids_for_projects(
    db: AsyncSession,
    project_ids: Sequence[int],
) -> dict[int, tuple[int | None, int | None]]:
    """Return ``project_id -> (person_id, company_id)`` for primary contacts.

    Resolves the canonical path ``project_person → person → address`` for every
    ``primary``-labelled link of the given projects. The company id is read as
    ``Address.crm_company_id`` (a column of the person-owned address), so no
    foreign ``Company`` model is imported. Owned by the person aggregate
    (``person`` + ``address`` + ``project_person``).

    Args:
        db: Database session.
        project_ids: Projects to resolve the primary contacts for.

    Returns:
        Mapping of project id to ``(person_id, company_id)`` tuples.
    """
    ids = list(project_ids)
    if not ids:
        return {}
    result = await db.execute(
        select(ProjectPerson.project_id, Person.id, Address.crm_company_id)
        .select_from(ProjectPerson)
        .outerjoin(Person, Person.id == ProjectPerson.crm_person_id)
        .outerjoin(Address, Address.id == Person.address_id)
        .where(
            ProjectPerson.project_id.in_(ids),
            ProjectPerson.label == "primary",
        )
    )
    return {row[0]: (row[1], row[2]) for row in result.all()}
