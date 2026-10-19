"""Hunter enrichment writes for CRM persons (gjo_se_com).

Owns the fill-only enrichment of a persisted person from Hunter.io payloads
(Email Finder / Lead Enrich) and the LinkedIn/Xing search-URL defaults. Split
out of ``person_repository`` (God-File-Refactor) so the core CRUD and the plain
reads stay separate concerns; the mapper and ``get_by_id`` are reused from
``person_read_repository``.
"""

from __future__ import annotations

from typing import Any
from urllib.parse import quote_plus

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crm.models.person import Person
from app.crm.repositories.person_read_repository import _to_out, get_by_id
from app.crm.schemas.person_schemas import PersonOut

_LINKEDIN_PERSON_SEARCH_URL = "https://linkedin.com/search/results/all/?keywords={query}"
_XING_PERSON_SEARCH_URL = "https://www.xing.com/search/members?keywords={query}"


async def apply_email_finder_result(db: AsyncSession, person_id: int, result: dict[str, Any]) -> PersonOut | None:
    """Map a Hunter Email Finder response onto a person (fill-only).

    Only sets a field when the current value is NULL – existing data is never
    overwritten. ``confidence_score`` and ``enrichment_source`` are always set.

    Args:
        db: Database session.
        person_id: Person to enrich.
        result: Hunter Email Finder payload (``email``, ``score``, ``position``,
            ``linkedin_url``, ``phone_number``).

    Returns:
        Updated person as DTO, or ``None`` when the person does not exist.
    """
    person = await db.get(Person, person_id)
    if person is None:
        return None

    found_email: str = result["email"]
    if not person.email:
        person.email = found_email

    person.confidence_score = result.get("score")
    person.enrichment_source = "hunter"

    if not person.role:
        position = result.get("position")
        if position:
            person.role = position
    if not person.linkedin_url:
        linkedin = result.get("linkedin_url")
        if linkedin:
            person.linkedin_url = linkedin
    if not person.phone:
        phone = result.get("phone_number")
        if phone:
            person.phone = phone

    await db.flush()
    return await get_by_id(db, person_id)


async def apply_person_search_url_defaults(db: AsyncSession, person_id: int) -> PersonOut | None:
    """Set LinkedIn and Xing search-URL placeholders when no real URL exists.

    Only sets a field when it is currently NULL and the person has both
    first and last name (needed to build a meaningful search query).

    Args:
        db: Database session.
        person_id: Person to fill the search-URL defaults for.

    Returns:
        Updated person as DTO, or ``None`` when the person does not exist.
    """
    person = await db.get(Person, person_id, options=[selectinload(Person.address)])
    if person is None:
        return None

    if not person.first_name or not person.last_name:
        return _to_out(person)

    query = quote_plus(f"{person.first_name} {person.last_name}")
    if not person.linkedin_url:
        person.linkedin_url = _LINKEDIN_PERSON_SEARCH_URL.format(query=query)
    if not person.xing_url:
        person.xing_url = _XING_PERSON_SEARCH_URL.format(query=query)

    await db.flush()
    return await get_by_id(db, person_id)


async def apply_lead_enrich_result(db: AsyncSession, person_id: int, result: dict[str, Any]) -> bool:
    """Map a Hunter Lead Enrich response onto a person (fill-only).

    Only fills fields that are currently NULL – existing data is never
    overwritten. Sets ``enrichment_source = "hunter_lead"`` on success.

    Args:
        db: Database session.
        person_id: Person to enrich.
        result: Hunter Lead Enrich payload.

    Returns:
        ``True`` if at least one field was enriched, ``False`` otherwise.
    """
    person = await db.get(Person, person_id)
    if person is None:
        return False

    enriched = False
    for attr, key in (
        ("first_name", "first_name"),
        ("last_name", "last_name"),
        ("role", "position"),
        ("linkedin_url", "linkedin_url"),
        ("phone", "phone_number"),
    ):
        value = result.get(key)
        if value and not getattr(person, attr):
            setattr(person, attr, value)
            enriched = True

    if enriched:
        person.enrichment_source = "hunter_lead"
        await db.flush()
    return enriched
