"""Integrationstests fuer company_service.merge_companies.

Regression: Hat die Zielfirma bereits eine Primaer-Adresse, darf der Merge die
umgehaengten Adressen nicht als primaer uebernehmen. Zwei ``is_primary``-Zeilen
auf einer Firma verdoppeln den ``person -> address -> company``-Join: die
Personen-Liste zeigt die Person doppelt und ``GET /persons/{id}`` schlaegt mit
``MultipleResultsFound`` (500) fehl.

Die Tests laufen auf der suite-weiten Postgres-Test-DB (``db_session``); die
Unternehmen werden nach dem Flush neu geladen, damit die eagerly-loaded
``tags``-Beziehung vor der DTO-Abbildung im Service geladen ist.
"""

from __future__ import annotations

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.models.address import Address
from app.crm.models.company import Company
from app.crm.models.person import Person
from app.crm.services import company_service

pytestmark = pytest.mark.integration


async def _primary_address_ids(db: AsyncSession, company_id: int) -> list[int]:
    """Return the IDs of all primary addresses of a company."""
    result = await db.execute(
        select(Address.id).where(
            Address.crm_company_id == company_id,
            Address.is_primary.is_(True),
        )
    )
    return list(result.scalars().all())


async def test_merge_demotes_moved_address_when_target_has_primary(
    db_session: AsyncSession,
) -> None:
    """Merge reassigns the person but never creates a second primary address."""
    target = Company(name="Merge Target GmbH")
    source = Company(name="Merge Source GmbH")
    db_session.add_all([target, source])
    await db_session.flush()

    target_address = Address(crm_company_id=target.id, is_primary=True)
    source_address = Address(crm_company_id=source.id, is_primary=True)
    db_session.add_all([target_address, source_address])
    await db_session.flush()

    person = Person(
        first_name="Björn",
        last_name="Gerhard",
        address_id=source_address.id,
    )
    db_session.add(person)
    await db_session.commit()
    await db_session.refresh(target)
    await db_session.refresh(source)

    await company_service.merge_companies(db_session, source.id, target.id)
    await db_session.commit()

    assert await db_session.get(Company, source.id) is None

    primaries = await _primary_address_ids(db_session, target.id)
    assert primaries == [target_address.id]

    await db_session.refresh(source_address)
    await db_session.refresh(target_address)
    assert source_address.crm_company_id == target.id
    assert source_address.is_primary is False
    assert target_address.is_primary is True


async def test_merge_promotes_oldest_address_when_target_has_no_primary(
    db_session: AsyncSession,
) -> None:
    """A target without primary address gets exactly one primary after merge."""
    target = Company(name="No Primary Target GmbH")
    source = Company(name="Primary Source GmbH")
    db_session.add_all([target, source])
    await db_session.flush()

    source_address = Address(crm_company_id=source.id, is_primary=True)
    db_session.add(source_address)
    await db_session.commit()
    await db_session.refresh(target)
    await db_session.refresh(source)

    await company_service.merge_companies(db_session, source.id, target.id)
    await db_session.commit()

    primaries = await _primary_address_ids(db_session, target.id)
    assert primaries == [source_address.id]
