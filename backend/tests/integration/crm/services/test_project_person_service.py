"""Integration tests for ``project_person_service``.

Verifies the duplicate guard, the conflict-free ``move_links`` (demote a moved
primary, drop an exact duplicate) and the 404 on a missing link.
"""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.models.person import Person
from app.crm.models.project_person import ProjectPerson
from app.crm.repositories import project_person_repository
from app.crm.schemas.project_person_schemas import ProjectPersonCreate
from app.crm.services import project_person_service
from tests.factories import Factory

pytestmark = pytest.mark.integration


async def _person(db_session: AsyncSession, *, last_name: str) -> Person:
    person = Person(last_name=last_name)
    db_session.add(person)
    await db_session.flush()
    return person


async def test_create_link_raises_409_on_duplicate(db_session: AsyncSession) -> None:
    """A second link for the same (project, person) pair is rejected."""
    project = await Factory(db_session).project()
    person = await _person(db_session, last_name="Dupe")
    data = ProjectPersonCreate(project_id=project.id, crm_person_id=person.id, label="primary")
    await project_person_service.create_link(db_session, data)

    with pytest.raises(HTTPException) as exc_info:
        await project_person_service.create_link(db_session, data)

    assert exc_info.value.status_code == 409


async def test_move_links_demotes_moved_primary_when_target_has_primary(db_session: AsyncSession) -> None:
    """A moved primary becomes secondary when the target already has a primary."""
    source_project = await Factory(db_session).project(url="https://example.test/source-1")
    target_project = await Factory(db_session).project(url="https://example.test/target-1")
    moved_person = await _person(db_session, last_name="Moved")
    target_person = await _person(db_session, last_name="Existing")
    db_session.add(ProjectPerson(project_id=source_project.id, crm_person_id=moved_person.id, label="primary"))
    db_session.add(ProjectPerson(project_id=target_project.id, crm_person_id=target_person.id, label="primary"))
    await db_session.flush()

    moved = await project_person_service.move_links(db_session, source_project.id, target_project.id)

    links = await project_person_repository.find_by_project(db_session, target_project.id)
    moved_link = next(link for link in links if link.crm_person_id == moved_person.id)
    assert moved == 1
    assert moved_link.label == "secondary"


async def test_move_links_drops_person_already_on_target(db_session: AsyncSession) -> None:
    """A source link whose person is already on the target is dropped."""
    source_project = await Factory(db_session).project(url="https://example.test/source-2")
    target_project = await Factory(db_session).project(url="https://example.test/target-2")
    person = await _person(db_session, last_name="Shared")
    db_session.add(ProjectPerson(project_id=source_project.id, crm_person_id=person.id, label="secondary"))
    db_session.add(ProjectPerson(project_id=target_project.id, crm_person_id=person.id, label="primary"))
    await db_session.flush()

    moved = await project_person_service.move_links(db_session, source_project.id, target_project.id)

    assert moved == 0
    assert await project_person_repository.find_by_project(db_session, source_project.id) == []


async def test_delete_link_raises_404_when_missing(db_session: AsyncSession) -> None:
    """Deleting an unknown link is a 404."""
    with pytest.raises(HTTPException) as exc_info:
        await project_person_service.delete_link(db_session, 999999)

    assert exc_info.value.status_code == 404
