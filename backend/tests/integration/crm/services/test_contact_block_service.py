"""Integration tests for ``contact_block_service``.

Verifies that a ``rejected`` status on the person or its canonical company
raises ``ContactBlockedError``, that an unblocked person passes, and that an
unknown person id is a silent no-op.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.models.address import Address
from app.crm.models.company import Company
from app.crm.models.person import Person
from app.crm.services import contact_block_service
from app.shared.ports.crm_contact import ContactBlockedError
from app.shared.status.models.status import Status, Statusable

pytestmark = pytest.mark.integration


async def _rejected_status(db_session: AsyncSession) -> Status:
    """Create and flush the ``rejected`` status row."""
    status = Status(name="rejected", slug="rejected", category="crm", color_token="red")
    db_session.add(status)
    await db_session.flush()
    return status


async def test_unblocked_person_passes(db_session: AsyncSession) -> None:
    """A person without a rejected status raises nothing."""
    person = Person(last_name="Clean")
    db_session.add(person)
    await db_session.flush()

    await contact_block_service.assert_person_id_not_blocked(db_session, person.id)


async def test_person_with_rejected_status_raises_person_scope(db_session: AsyncSession) -> None:
    """A rejected person status blocks contact with ``scope='person'``."""
    person = Person(last_name="Blocked", contact_blocked_reason="Kein Kontakt gewuenscht")
    db_session.add(person)
    await db_session.flush()
    status = await _rejected_status(db_session)
    db_session.add(Statusable(status_id=status.id, statusable_type="crm_person", statusable_id=person.id))
    await db_session.flush()

    with pytest.raises(ContactBlockedError) as exc_info:
        await contact_block_service.assert_person_id_not_blocked(db_session, person.id)

    assert exc_info.value.scope == "person"
    assert exc_info.value.reason == "Kein Kontakt gewuenscht"


async def test_company_with_rejected_status_raises_company_scope(db_session: AsyncSession) -> None:
    """A rejected canonical company blocks contact with ``scope='company'``."""
    company = Company(name="Blocked GmbH", contact_blocked_reason="Blacklist")
    db_session.add(company)
    await db_session.flush()
    address = Address(crm_company_id=company.id, is_primary=True)
    db_session.add(address)
    await db_session.flush()
    person = Person(last_name="Employee", address_id=address.id)
    db_session.add(person)
    await db_session.flush()
    status = await _rejected_status(db_session)
    db_session.add(Statusable(status_id=status.id, statusable_type="crm_company", statusable_id=company.id))
    await db_session.flush()

    with pytest.raises(ContactBlockedError) as exc_info:
        await contact_block_service.assert_person_id_not_blocked(db_session, person.id)

    assert exc_info.value.scope == "company"
    assert exc_info.value.name == "Blocked GmbH"


async def test_unknown_person_id_is_silent_noop(db_session: AsyncSession) -> None:
    """An unknown person id does not raise."""
    await contact_block_service.assert_person_id_not_blocked(db_session, 999999)
