"""Integration tests for ``address_repository``.

Verifies primary-address lookup, per-company listing/sorting and CRUD against a
real schema.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.models.address import Address
from app.crm.models.company import Company
from app.crm.repositories import address_repository
from app.crm.schemas.address_schemas import AddressCreate

pytestmark = pytest.mark.integration


async def _company(db_session: AsyncSession, *, name: str = "Acme GmbH") -> Company:
    """Create and flush a company, returning it."""
    company = Company(name=name)
    db_session.add(company)
    await db_session.flush()
    return company


async def test_get_primary_for_company_returns_only_primary(db_session: AsyncSession) -> None:
    """Only the ``is_primary`` address is returned."""
    company = await _company(db_session)
    db_session.add(Address(crm_company_id=company.id, city="Berlin", is_primary=False))
    primary = Address(crm_company_id=company.id, city="Hamburg", is_primary=True)
    db_session.add(primary)
    await db_session.flush()

    found = await address_repository.get_primary_for_company(db_session, company.id)

    assert found is not None
    assert found.id == primary.id


async def test_list_by_company_sorts_by_city_descending(db_session: AsyncSession) -> None:
    """``sort_order='desc'`` orders the addresses by the requested column."""
    company = await _company(db_session)
    db_session.add(Address(crm_company_id=company.id, city="Aachen"))
    db_session.add(Address(crm_company_id=company.id, city="Zwickau"))
    await db_session.flush()

    result = await address_repository.list_by_company(db_session, company.id, sort_by="city", sort_order="desc")

    assert [address.city for address in result] == ["Zwickau", "Aachen"]


async def test_create_and_delete_roundtrip(db_session: AsyncSession) -> None:
    """A created address is retrievable and removed on delete."""
    company = await _company(db_session)
    address = await address_repository.create(db_session, AddressCreate(crm_company_id=company.id, city="Koeln"))
    address_id = address.id

    assert await address_repository.get_by_id(db_session, address_id) is not None

    await address_repository.delete(db_session, address_id)

    assert await address_repository.get_by_id(db_session, address_id) is None
