"""Integration tests for the ``ProjectPerson`` junction model.

Verifies the two uniqueness contracts: the composite
``(project_id, crm_person_id)`` constraint and the partial unique index
allowing at most one ``primary`` contact per project.
"""

from __future__ import annotations

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.models.person import Person
from app.crm.models.project_person import ProjectPerson
from tests.factories import Factory

pytestmark = pytest.mark.integration


async def _project_id(db_session: AsyncSession) -> int:
    """Create a persisted project and return its id."""
    project = await Factory(db_session).project()
    return project.id


async def _person_id(db_session: AsyncSession, *, last_name: str) -> int:
    """Create a persisted person and return its id."""
    person = Person(last_name=last_name)
    db_session.add(person)
    await db_session.flush()
    return person.id


async def test_project_person_pair_is_unique(db_session: AsyncSession) -> None:
    """The same (project_id, crm_person_id) pair cannot be linked twice."""
    project_id = await _project_id(db_session)
    person_id = await _person_id(db_session, last_name="Linked")

    db_session.add(ProjectPerson(project_id=project_id, crm_person_id=person_id, label="primary"))
    await db_session.flush()

    db_session.add(ProjectPerson(project_id=project_id, crm_person_id=person_id, label="secondary"))
    with pytest.raises(IntegrityError):
        await db_session.flush()

    await db_session.rollback()


async def test_project_allows_only_one_primary_contact(db_session: AsyncSession) -> None:
    """A second ``primary`` link for the same project is rejected."""
    project_id = await _project_id(db_session)
    first_person = await _person_id(db_session, last_name="First")
    second_person = await _person_id(db_session, last_name="Second")

    db_session.add(ProjectPerson(project_id=project_id, crm_person_id=first_person, label="primary"))
    await db_session.flush()

    db_session.add(ProjectPerson(project_id=project_id, crm_person_id=second_person, label="primary"))
    with pytest.raises(IntegrityError):
        await db_session.flush()

    await db_session.rollback()


async def test_project_allows_multiple_secondary_contacts(db_session: AsyncSession) -> None:
    """Several ``secondary`` links for the same project are allowed."""
    project_id = await _project_id(db_session)
    first_person = await _person_id(db_session, last_name="First")
    second_person = await _person_id(db_session, last_name="Second")

    db_session.add(ProjectPerson(project_id=project_id, crm_person_id=first_person, label="secondary"))
    db_session.add(ProjectPerson(project_id=project_id, crm_person_id=second_person, label="secondary"))
    await db_session.flush()

    assert True
