"""Integration tests for ``person_service``.

Verifies the email-conflict guards (create + update), the nullable-email
contract, the 404 on a missing person and delete.
"""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.models.person import Person
from app.crm.schemas.person_schemas import PersonCreate, PersonUpdate
from app.crm.services import person_service

pytestmark = pytest.mark.integration


async def test_create_person_raises_409_on_duplicate_email(db_session: AsyncSession) -> None:
    """A second person with the same email is rejected with 409."""
    await person_service.create_person(db_session, PersonCreate(last_name="One", email="dupe@example.com"))

    with pytest.raises(HTTPException) as exc_info:
        await person_service.create_person(db_session, PersonCreate(last_name="Two", email="dupe@example.com"))

    assert exc_info.value.status_code == 409


async def test_create_person_without_email_persists_null_email(db_session: AsyncSession) -> None:
    """A person without email keeps ``email IS NULL`` (no fabricated placeholder)."""
    created = await person_service.create_person(db_session, PersonCreate(first_name="No", last_name="Mail"))

    assert created.email is None
    assert created.id is not None


async def test_update_person_email_conflict_raises_409(db_session: AsyncSession) -> None:
    """Changing to an email already used by another person is a 409."""
    first = await person_service.create_person(db_session, PersonCreate(last_name="First", email="first@example.com"))
    await person_service.create_person(db_session, PersonCreate(last_name="Second", email="second@example.com"))

    with pytest.raises(HTTPException) as exc_info:
        await person_service.update_person(db_session, first.id, PersonUpdate(email="second@example.com"))

    assert exc_info.value.status_code == 409


async def test_get_person_raises_404_when_missing(db_session: AsyncSession) -> None:
    """Fetching an unknown person is a 404."""
    with pytest.raises(HTTPException) as exc_info:
        await person_service.get_person(db_session, 999999)

    assert exc_info.value.status_code == 404


async def test_delete_person_removes_row(db_session: AsyncSession) -> None:
    """Deleting a person leaves no row behind."""
    person = await person_service.create_person(db_session, PersonCreate(last_name="Temp"))
    person_id = person.id

    await person_service.delete_person(db_session, person_id)

    assert await db_session.get(Person, person_id) is None
