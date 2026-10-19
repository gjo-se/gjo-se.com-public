"""Core person reads plus the ORM→DTO mapper (gjo_se_com).

Owns the single-row lookups of the person aggregate (by id, email or name) and
the ``_to_out`` mapper that every person companion reuses. Split out of
``person_repository`` (God-File-Refactor) so the company-joined reads, the
owner-side seams and the enrichment writes stay separate concerns; the modules
import ``_to_out`` / ``get_by_id`` from here (the facade re-exports them for
stable consumer imports).

Read/write operations return ``PersonOut`` DTOs (never ORM models) so the
service layer stays free of ``app.crm.models`` imports (Achse-2: ``services`` >
``repositories``).
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crm.models.address import Address
from app.crm.models.person import Person
from app.crm.schemas.person_schemas import PersonOut


def _to_out(person: Person) -> PersonOut:
    """Maps a person ORM row to its DTO.

    Args:
        person: The persisted ``Person`` row (with eagerly loaded ``address``).

    Returns:
        The read DTO handed to the service layer.
    """
    return PersonOut.model_validate(person)


async def get_by_id(db: AsyncSession, person_id: int) -> PersonOut | None:
    """Return a single person by primary key as DTO.

    Args:
        db: Database session.
        person_id: UUID of the person to fetch.

    Returns:
        Person DTO or ``None`` if not found.
    """
    result = await db.execute(select(Person).options(selectinload(Person.address)).where(Person.id == person_id))
    person = result.scalar_one_or_none()
    return _to_out(person) if person is not None else None


async def get_by_email(db: AsyncSession, email: str) -> PersonOut | None:
    """Return a person by case-insensitive email match as DTO.

    Uses ``func.lower()`` for case-insensitive comparison to leverage
    the unique index on ``lower(email)``.

    Args:
        db: Database session.
        email: Email address (any case).

    Returns:
        Person DTO or ``None`` if not found.
    """
    result = await db.execute(
        select(Person).options(selectinload(Person.address)).where(func.lower(Person.email) == func.lower(email))
    )
    person = result.scalar_one_or_none()
    return _to_out(person) if person is not None else None


async def get_by_email_excluding(db: AsyncSession, email: str, exclude_id: int) -> PersonOut | None:
    """Return a person by case-insensitive email, excluding one row id.

    Multiple case-variant rows can share the same lower(email), so the
    excluded id (typically the current placeholder) is filtered server-side
    to keep the lookup single-valued.

    Args:
        db: Database session.
        email: Email address (any case).
        exclude_id: Person id to ignore (usually the caller's own row).

    Returns:
        The oldest other matching person DTO or ``None``.
    """
    result = await db.execute(
        select(Person)
        .options(selectinload(Person.address))
        .where(
            func.lower(Person.email) == func.lower(email),
            Person.id != exclude_id,
        )
        .order_by(Person.created_at.asc())
        .limit(1)
    )
    person = result.scalar_one_or_none()
    return _to_out(person) if person is not None else None


async def find_by_name_and_company(
    db: AsyncSession,
    first_name: str,
    last_name: str,
    company_id: int,
) -> PersonOut | None:
    """Return a person matching name and linked company (via canonical path).

    Joins ``Person → Address`` and filters on the company, so only
    persons whose address belongs to ``company_id`` are considered. Most
    recently created match wins.

    Args:
        db: Database session.
        first_name: First name (case-insensitive).
        last_name: Last name (case-insensitive).
        company_id: Company the person must be linked to.

    Returns:
        Matching person DTO or ``None``.
    """
    result = await db.execute(
        select(Person)
        .options(selectinload(Person.address))
        .join(Address, Person.address_id == Address.id)
        .where(
            func.lower(Person.first_name) == func.lower(first_name),
            func.lower(Person.last_name) == func.lower(last_name),
            Address.crm_company_id == company_id,
        )
        .order_by(Person.created_at.desc())
        .limit(1)
    )
    person = result.scalar_one_or_none()
    return _to_out(person) if person is not None else None


async def find_by_name(db: AsyncSession, first_name: str, last_name: str) -> PersonOut | None:
    """Find a person by case-insensitive first + last name match as DTO.

    Most recently created match wins.

    Args:
        db: Database session.
        first_name: First name to search for.
        last_name: Last name to search for.

    Returns:
        Matching person DTO or ``None``.
    """
    result = await db.execute(
        select(Person)
        .options(selectinload(Person.address))
        .where(
            func.lower(Person.first_name) == func.lower(first_name),
            func.lower(Person.last_name) == func.lower(last_name),
        )
        .order_by(Person.created_at.desc())
        .limit(1)
    )
    person = result.scalar_one_or_none()
    return _to_out(person) if person is not None else None


async def list_by_address(db: AsyncSession, address_id: int) -> list[PersonOut]:
    """Return all persons linked to a specific address as DTOs.

    Args:
        db: Database session.
        address_id: Primary key of the ``crm_address`` row.

    Returns:
        List of person DTOs whose ``crm_address_id`` points to ``address_id``.
    """
    result = await db.execute(
        select(Person).options(selectinload(Person.address)).where(Person.address_id == address_id)
    )
    return [_to_out(person) for person in result.scalars().all()]
