"""Integration tests for the ``Person`` model.

Verifies the email uniqueness contract (nullable, real addresses deduplicated)
and the FK ``ondelete="SET NULL"`` on ``crm_address_id``.
"""

from __future__ import annotations

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.models.address import Address
from app.crm.models.company import Company
from app.crm.models.person import Person

pytestmark = pytest.mark.integration


async def test_person_email_is_unique(db_session: AsyncSession) -> None:
    """Two persons with the same email are rejected."""
    db_session.add(Person(last_name="One", email="dupe@example.test"))
    await db_session.flush()

    db_session.add(Person(last_name="Two", email="dupe@example.test"))
    with pytest.raises(IntegrityError):
        await db_session.flush()

    await db_session.rollback()


async def test_person_email_null_is_allowed_multiple_times(db_session: AsyncSession) -> None:
    """The nullable unique email permits several persons with unknown email."""
    db_session.add(Person(last_name="One", email=None))
    db_session.add(Person(last_name="Two", email=None))
    await db_session.flush()

    assert True


async def test_deleting_address_clears_person_address_reference(db_session: AsyncSession) -> None:
    """Deleting an address sets the linked person's ``address_id`` to NULL."""
    company = Company(name="Set Null GmbH")
    db_session.add(company)
    await db_session.flush()
    address = Address(crm_company_id=company.id, city="Koeln")
    db_session.add(address)
    await db_session.flush()
    person = Person(last_name="Detached", address_id=address.id)
    db_session.add(person)
    await db_session.commit()
    person_id = person.id

    await db_session.delete(address)
    await db_session.flush()
    db_session.expire_all()

    reloaded = await db_session.get(Person, person_id)
    assert reloaded is not None
    assert reloaded.address_id is None
