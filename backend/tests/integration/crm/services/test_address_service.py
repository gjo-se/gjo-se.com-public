"""Integration tests for ``address_service``.

Verifies the company/person invariants of address CRUD against a real schema:
404 for a missing company, single-primary demotion, and the last-address delete
guard (409) plus person re-linking on delete.
"""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.models.address import Address
from app.crm.models.company import Company
from app.crm.models.person import Person
from app.crm.schemas.address_schemas import AddressCreate, AddressUpdate
from app.crm.services import address_service

pytestmark = pytest.mark.integration


async def _company(db_session: AsyncSession, *, name: str) -> Company:
    company = Company(name=name)
    db_session.add(company)
    await db_session.flush()
    # Reload so the eagerly-loaded ``tags`` relationship is populated before the
    # service maps the company to its DTO (avoids a lazy load in a sync context).
    await db_session.refresh(company)
    return company


async def test_create_address_raises_404_when_company_missing(db_session: AsyncSession) -> None:
    """Creating an address for an unknown company is a 404."""
    with pytest.raises(HTTPException) as exc_info:
        await address_service.create_address(db_session, AddressCreate(crm_company_id=999999))

    assert exc_info.value.status_code == 404


async def test_create_primary_address_demotes_existing_primary(db_session: AsyncSession) -> None:
    """A new primary address demotes the previous primary of the company."""
    company = await _company(db_session, name="Demote GmbH")
    old_primary = Address(crm_company_id=company.id, city="Berlin", is_primary=True)
    db_session.add(old_primary)
    await db_session.flush()

    created = await address_service.create_address(
        db_session, AddressCreate(crm_company_id=company.id, city="Hamburg", is_primary=True)
    )

    await db_session.refresh(old_primary)
    assert created.is_primary is True
    assert old_primary.is_primary is False


async def test_update_address_to_primary_demotes_other_primary(db_session: AsyncSession) -> None:
    """Promoting one address demotes the company's current primary."""
    company = await _company(db_session, name="Update GmbH")
    current_primary = Address(crm_company_id=company.id, city="Berlin", is_primary=True)
    other = Address(crm_company_id=company.id, city="Hamburg", is_primary=False)
    db_session.add_all([current_primary, other])
    await db_session.flush()

    await address_service.update_address(db_session, other.id, AddressUpdate(is_primary=True))

    await db_session.refresh(current_primary)
    await db_session.refresh(other)
    assert other.is_primary is True
    assert current_primary.is_primary is False


async def test_delete_last_address_with_linked_persons_raises_409(db_session: AsyncSession) -> None:
    """Deleting the only address while persons are linked is rejected."""
    company = await _company(db_session, name="Guard GmbH")
    address = Address(crm_company_id=company.id, city="Berlin", is_primary=True)
    db_session.add(address)
    await db_session.flush()
    db_session.add(Person(last_name="Attached", address_id=address.id))
    await db_session.flush()

    with pytest.raises(HTTPException) as exc_info:
        await address_service.delete_address(db_session, address.id)

    assert exc_info.value.status_code == 409


async def test_delete_address_relinks_persons_and_promotes_replacement(db_session: AsyncSession) -> None:
    """Persons are moved to a sibling and the sibling becomes primary."""
    company = await _company(db_session, name="Relink GmbH")
    primary = Address(crm_company_id=company.id, city="Berlin", is_primary=True)
    sibling = Address(crm_company_id=company.id, city="Koeln", is_primary=False)
    db_session.add_all([primary, sibling])
    await db_session.flush()
    person = Person(last_name="Moved", address_id=primary.id)
    db_session.add(person)
    await db_session.commit()

    await address_service.delete_address(db_session, primary.id)

    await db_session.refresh(person)
    await db_session.refresh(sibling)
    assert await db_session.get(Address, primary.id) is None
    assert person.address_id == sibling.id
    assert sibling.is_primary is True
