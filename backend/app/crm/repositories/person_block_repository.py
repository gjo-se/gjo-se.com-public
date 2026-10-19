"""Contact-block context load for CRM persons (gjo_se_com).

Owns the person + canonical-company load (``person → address → company``) used
by the contact-block check. Split out of ``person_repository`` so that module
stays cohesive (LCOM4) – the DB access itself keeps the person aggregate
(``person`` + ``address``).
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crm.models.address import Address
from app.crm.models.person import Person


@dataclass(frozen=True, slots=True)
class PersonBlockContext:
    """Contact-block context of a person and its canonical company.

    Attributes:
        person_id: The person's primary key.
        contact_blocked_reason: Person-level block reason (may be ``None``).
        company_id: Canonical company id via ``person → address → company``
            (``None`` when the person has no address).
        company_name: Canonical company name (``None`` when no company).
        company_contact_blocked_reason: Company-level block reason (may be ``None``).
    """

    person_id: int
    contact_blocked_reason: str | None
    company_id: int | None
    company_name: str | None
    company_contact_blocked_reason: str | None


async def get_block_context(db: AsyncSession, person_id: int) -> PersonBlockContext | None:
    """Load the contact-block context for a person (with canonical company).

    Args:
        db: Database session.
        person_id: Person to look up.

    Returns:
        The block context, or ``None`` when the person does not exist.
    """
    result = await db.execute(
        select(Person).options(selectinload(Person.address).selectinload(Address.company)).where(Person.id == person_id)
    )
    person = result.scalar_one_or_none()
    if person is None:
        return None

    company = person.address.company if person.address is not None else None
    return PersonBlockContext(
        person_id=person.id,
        contact_blocked_reason=person.contact_blocked_reason,
        company_id=company.id if company is not None else None,
        company_name=company.name if company is not None else None,
        company_contact_blocked_reason=company.contact_blocked_reason if company is not None else None,
    )
