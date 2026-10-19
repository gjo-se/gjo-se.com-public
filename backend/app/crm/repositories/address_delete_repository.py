"""Address deletion with person re-linking (gjo_se_com).

Owns the delete-with-relink operation. The person-side access (re-link persons
whose ``crm_address_id`` points to the deleted address) is delegated to the
owner repository ``person_repository`` so this adapter touches only its own
aggregate (``address``).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.models.address import Address
from app.crm.repositories import person_repository


@dataclass(frozen=True, slots=True)
class AddressDeleteResult:
    """Outcome of :func:`delete_with_relink`.

    Attributes:
        status: ``deleted`` when the row was removed, ``not_found`` when no row
            exists, ``blocked_last_with_persons`` when the address is the
            company's last one and still has linked persons.
        person_count: Number of linked persons (only set for the blocked case).
    """

    status: Literal["deleted", "not_found", "blocked_last_with_persons"]
    person_count: int = 0


async def delete_with_relink(db: AsyncSession, address_id: int) -> AddressDeleteResult:
    """Deletes an address, first re-linking its persons to a sibling address.

    Persons whose ``crm_address_id`` points to the deleted address are re-linked
    to another remaining address of the same company (preferred: a primary one).
    Company membership is derived via ``person → address → company``, so without
    this the persons would be silently detached. The person re-link is delegated
    to the owner repository ``person_repository``.

    When the address is the company's last one and persons are still linked, the
    delete is refused – removing it would orphan those persons.

    Args:
        db: Database session.
        address_id: UUID of the address to delete.

    Returns:
        The delete outcome (see :class:`AddressDeleteResult`).
    """
    address = await db.get(Address, address_id)
    if address is None:
        return AddressDeleteResult(status="not_found")

    company_id = address.crm_company_id

    siblings_result = await db.execute(select(Address).where(Address.crm_company_id == company_id))
    siblings = list(siblings_result.scalars().all())
    replacement = next((a for a in siblings if a.id != address_id and a.is_primary), None) or next(
        (a for a in siblings if a.id != address_id), None
    )

    person_ids = await person_repository.person_ids_by_address(db, address_id)

    if replacement is None and person_ids:
        return AddressDeleteResult(status="blocked_last_with_persons", person_count=len(person_ids))

    if replacement is not None:
        await person_repository.reassign_address(db, person_ids, replacement.id)
        if address.is_primary and not replacement.is_primary:
            replacement.is_primary = True

    await db.delete(address)
    await db.flush()
    return AddressDeleteResult(status="deleted")
