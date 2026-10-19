"""Integration tests for ``job_role_repository``.

Verifies the analytic job-role access against the real (container) database:
create/lookup, name-ordered listing, guard on empty id input, filtered count and
pagination, status projection, confirmed filter and delete. Public interface
only.

Project-side cross-aggregate logic (referencing count, reassignment) is owned by
``project_repository`` and covered there.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.job_role import JobRole
from app.fbf.repositories import job_role_repository
from app.shared.status.models.status import Status, Statusable

pytestmark = pytest.mark.integration


async def test_create_persists_job_role_retrievable_by_name(db_session: AsyncSession) -> None:
    """A created job role is retrievable by its unique name."""
    created = await job_role_repository.create(db_session, "AI Engineer")

    found = await job_role_repository.get_by_name(db_session, "AI Engineer")

    assert created.id is not None
    assert found is not None
    assert found.id == created.id


async def test_get_all_orders_job_roles_by_name(db_session: AsyncSession) -> None:
    """The listing is ordered ascending by name."""
    db_session.add_all([JobRole(name="Zeta"), JobRole(name="Alpha"), JobRole(name="Mid")])
    await db_session.flush()

    rows = await job_role_repository.get_all(db_session)

    assert [row.name for row in rows] == ["Alpha", "Mid", "Zeta"]


async def test_get_by_ids_returns_empty_list_for_empty_input(db_session: AsyncSession) -> None:
    """An empty id list short-circuits to an empty result (guard path)."""
    assert await job_role_repository.get_by_ids(db_session, []) == []


async def test_get_by_ids_returns_only_matching_job_roles(db_session: AsyncSession) -> None:
    """Only the requested ids are returned."""
    first = JobRole(name="Rolle Eins")
    second = JobRole(name="Rolle Zwei")
    db_session.add_all([first, second, JobRole(name="Rolle Drei")])
    await db_session.flush()

    rows = await job_role_repository.get_by_ids(db_session, [first.id, second.id])

    assert sorted(row.name for row in rows) == ["Rolle Eins", "Rolle Zwei"]


async def test_count_and_paginated_filter_narrow_to_matching_name(db_session: AsyncSession) -> None:
    """The search term narrows both the paginated rows and the count."""
    db_session.add_all([JobRole(name="Backend Developer"), JobRole(name="Data Engineer")])
    await db_session.flush()

    rows = await job_role_repository.get_paginated_with_status(db_session, q="Backend")
    total = await job_role_repository.count_filtered(db_session, q="Backend")

    assert [row[0].name for row in rows] == ["Backend Developer"]
    assert total == 1


async def test_get_all_with_status_exposes_core_status_name_and_color(db_session: AsyncSession) -> None:
    """The active status of a job role is projected as name and color token."""
    role = JobRole(name="Kuratierte Rolle")
    status = Status(name="active", slug="job-role-active", category="fbf", color_token="green")
    db_session.add_all([role, status])
    await db_session.flush()
    db_session.add(Statusable(status_id=status.id, statusable_type="fbf_job_role", statusable_id=role.id))
    await db_session.flush()

    rows = await job_role_repository.get_all_with_status(db_session)

    assert [(row[0].name, row[1], row[2]) for row in rows] == [("Kuratierte Rolle", "active", "green")]


async def test_get_confirmed_returns_only_roles_with_active_status(db_session: AsyncSession) -> None:
    """The confirmed filter keeps only roles whose core status is active."""
    confirmed = JobRole(name="Bestaetigte Rolle")
    pending = JobRole(name="Offene Rolle")
    status = Status(name="active", slug="job-role-confirmed", category="fbf", color_token="green")
    db_session.add_all([confirmed, pending, status])
    await db_session.flush()
    db_session.add(Statusable(status_id=status.id, statusable_type="fbf_job_role", statusable_id=confirmed.id))
    await db_session.flush()

    rows = await job_role_repository.get_confirmed(db_session)

    assert [row.name for row in rows] == ["Bestaetigte Rolle"]


async def test_delete_removes_job_role_row(db_session: AsyncSession) -> None:
    """Deleting a job role leaves no row behind."""
    role = await job_role_repository.create(db_session, "Zu loeschen")
    role_id = role.id

    await job_role_repository.delete(db_session, role_id)

    assert await job_role_repository.get_by_id(db_session, role_id) is None
