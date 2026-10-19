"""Integration tests for ``project_person_repository``.

Verifies project/person/duplicate lookups and the create/delete roundtrip of the
project↔person junction against a real schema.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.models.person import Person
from app.crm.models.project_person import ProjectPerson
from app.crm.repositories import project_person_repository
from app.crm.schemas.project_person_schemas import ProjectPersonCreate
from tests.factories import Factory

pytestmark = pytest.mark.integration


async def _person(db_session: AsyncSession, *, last_name: str) -> Person:
    """Create and flush a person, returning it."""
    person = Person(last_name=last_name)
    db_session.add(person)
    await db_session.flush()
    return person


async def test_find_by_project_returns_all_links(db_session: AsyncSession) -> None:
    """Every link of the project is returned."""
    project = await Factory(db_session).project()
    first = await _person(db_session, last_name="First")
    second = await _person(db_session, last_name="Second")
    db_session.add(ProjectPerson(project_id=project.id, crm_person_id=first.id, label="primary"))
    db_session.add(ProjectPerson(project_id=project.id, crm_person_id=second.id, label="secondary"))
    await db_session.flush()

    links = await project_person_repository.find_by_project(db_session, project.id)

    assert {link.crm_person_id for link in links} == {first.id, second.id}


async def test_find_by_person_returns_linked_projects(db_session: AsyncSession) -> None:
    """All project links of a person are returned."""
    project = await Factory(db_session).project()
    person = await _person(db_session, last_name="Solo")
    db_session.add(ProjectPerson(project_id=project.id, crm_person_id=person.id, label="primary"))
    await db_session.flush()

    links = await project_person_repository.find_by_person(db_session, person.id)

    assert [link.project_id for link in links] == [project.id]


async def test_find_duplicate_detects_existing_pair(db_session: AsyncSession) -> None:
    """An existing (project, person) pair is found; a missing one is not."""
    project = await Factory(db_session).project()
    person = await _person(db_session, last_name="Dupe")
    db_session.add(ProjectPerson(project_id=project.id, crm_person_id=person.id, label="primary"))
    await db_session.flush()

    existing = await project_person_repository.find_duplicate(db_session, project.id, person.id)
    missing = await project_person_repository.find_duplicate(db_session, project.id + 999, person.id)

    assert existing is not None
    assert missing is None


async def test_create_and_delete_roundtrip(db_session: AsyncSession) -> None:
    """A created link is retrievable by id and removed on delete."""
    project = await Factory(db_session).project()
    person = await _person(db_session, last_name="Temp")
    link = await project_person_repository.create(
        db_session, ProjectPersonCreate(project_id=project.id, crm_person_id=person.id, label="secondary")
    )
    link_id = link.id

    assert await project_person_repository.get_by_id(db_session, link_id) is not None

    await project_person_repository.delete(db_session, link_id)

    assert await project_person_repository.get_by_id(db_session, link_id) is None
