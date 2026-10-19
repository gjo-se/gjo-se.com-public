"""Integration tests for ``person_repository``.

Verifies case-insensitive email lookup, exclusion-aware email lookup,
name+company resolution, address listing and delete.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.models.address import Address
from app.crm.models.company import Company
from app.crm.models.person import Person
from app.crm.repositories import person_repository
from app.crm.schemas.person_schemas import PersonCreate

pytestmark = pytest.mark.integration


async def test_get_by_email_matches_ignoring_case(db_session: AsyncSession) -> None:
    """The email lookup lowercases both sides."""
    db_session.add(Person(last_name="One", email="person@example.test"))
    await db_session.flush()

    found = await person_repository.get_by_email(db_session, "PERSON@EXAMPLE.TEST")

    assert found is not None
    assert found.last_name == "One"


async def test_get_by_email_excluding_skips_the_excluded_row(db_session: AsyncSession) -> None:
    """The excluded id is filtered out, returning the other case-variant row."""
    first = Person(last_name="First", email="shared@example.test")
    second = Person(last_name="Second", email="SHARED@example.test")
    db_session.add_all([first, second])
    await db_session.flush()

    found = await person_repository.get_by_email_excluding(db_session, "shared@example.test", first.id)

    assert found is not None
    assert found.id == second.id


async def test_find_by_name_and_company_requires_matching_company(db_session: AsyncSession) -> None:
    """A person is only matched when linked to the given company."""
    company = Company(name="Target GmbH")
    other = Company(name="Other GmbH")
    db_session.add_all([company, other])
    await db_session.flush()
    address = Address(crm_company_id=company.id, is_primary=True)
    db_session.add(address)
    await db_session.flush()
    db_session.add(Person(first_name="Stefan", last_name="Berntheisel", address_id=address.id))
    await db_session.flush()

    match = await person_repository.find_by_name_and_company(db_session, "stefan", "BERNTHEISEL", company.id)
    miss = await person_repository.find_by_name_and_company(db_session, "Stefan", "Berntheisel", other.id)

    assert match is not None
    assert miss is None


async def test_list_paginated_filters_by_name(db_session: AsyncSession) -> None:
    """The search term narrows the paginated person list."""
    db_session.add(Person(first_name="Anna", last_name="Match"))
    db_session.add(Person(first_name="Ben", last_name="Other"))
    await db_session.flush()

    rows = await person_repository.list_paginated(db_session, q="Match")

    assert [row.last_name for row in rows] == ["Match"]


async def test_create_and_delete_roundtrip(db_session: AsyncSession) -> None:
    """A created person is retrievable and removed on delete."""
    person = await person_repository.create(db_session, PersonCreate(last_name="Temp"))
    person_id = person.id

    assert await person_repository.get_by_id(db_session, person_id) is not None

    await person_repository.delete(db_session, person_id)

    assert await person_repository.get_by_id(db_session, person_id) is None


async def test_apply_email_finder_result_fills_only_empty_fields(db_session: AsyncSession) -> None:
    """Email Finder data never overwrites existing values, but sets score/source."""
    person = Person(last_name="Keep", email="keep@example.test", role="Boss")
    db_session.add(person)
    await db_session.flush()

    updated = await person_repository.apply_email_finder_result(
        db_session,
        person.id,
        {
            "email": "new@example.test",
            "score": 88,
            "position": "CTO",
            "linkedin_url": "https://linkedin.test/x",
            "phone_number": "+49",
        },
    )

    assert updated is not None
    assert updated.email == "keep@example.test"
    assert updated.role == "Boss"
    assert updated.confidence_score == 88
    assert updated.enrichment_source == "hunter"
    assert updated.linkedin_url == "https://linkedin.test/x"
    assert updated.phone == "+49"


async def test_apply_person_search_url_defaults_sets_placeholders(db_session: AsyncSession) -> None:
    """LinkedIn/Xing search-URL placeholders are derived from the person's name."""
    person = Person(first_name="Gregory", last_name="Erdmann")
    db_session.add(person)
    await db_session.flush()

    updated = await person_repository.apply_person_search_url_defaults(db_session, person.id)

    assert updated is not None
    assert updated.linkedin_url == "https://linkedin.com/search/results/all/?keywords=Gregory+Erdmann"
    assert updated.xing_url == "https://www.xing.com/search/members?keywords=Gregory+Erdmann"


async def test_apply_lead_enrich_result_fills_only_empty_fields(db_session: AsyncSession) -> None:
    """Lead Enrich fills empty fields, keeps existing ones and flags the source."""
    person = Person(email="lead@example.test", role="Boss")
    db_session.add(person)
    await db_session.flush()

    enriched = await person_repository.apply_lead_enrich_result(
        db_session,
        person.id,
        {
            "first_name": "Gregory",
            "last_name": "Erdmann",
            "position": "Architekt",
            "linkedin_url": "https://linkedin.test/greg",
            "phone_number": "+49",
        },
    )

    assert enriched is True
    reloaded = await person_repository.get_by_id(db_session, person.id)
    assert reloaded is not None
    assert reloaded.first_name == "Gregory"
    assert reloaded.last_name == "Erdmann"
    assert reloaded.role == "Boss"
    assert reloaded.enrichment_source == "hunter_lead"
