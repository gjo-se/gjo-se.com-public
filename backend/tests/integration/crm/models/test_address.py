"""Integration tests for the ``Address`` model.

Verifies the ORM/DB contract: ``is_primary`` defaults to ``False`` and deleting
a company cascades to its addresses (relationship cascade + FK
``ondelete="CASCADE"``).
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.models.address import Address
from app.crm.models.company import Company

pytestmark = pytest.mark.integration


async def test_address_is_primary_defaults_to_false(db_session: AsyncSession) -> None:
    """A freshly persisted address is not primary by default."""
    company = Company(name="Acme GmbH")
    db_session.add(company)
    await db_session.flush()

    address = Address(crm_company_id=company.id, city="Berlin")
    db_session.add(address)
    await db_session.flush()
    await db_session.refresh(address)

    assert address.is_primary is False


async def test_deleting_company_cascades_to_its_addresses(db_session: AsyncSession) -> None:
    """Removing a company also removes its addresses."""
    company = Company(name="Cascade GmbH")
    db_session.add(company)
    await db_session.flush()
    address = Address(crm_company_id=company.id, city="Hamburg")
    db_session.add(address)
    await db_session.commit()
    address_id = address.id

    await db_session.delete(company)
    await db_session.commit()

    assert await db_session.get(Address, address_id) is None
