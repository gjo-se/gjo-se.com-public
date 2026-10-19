"""Integration tests for the statusable repository join resolution.

``resolve_status`` / ``resolve_status_map`` join ``shared_status`` starting from
the ``shared_statusable`` junction (``select_from(Statusable)``). Before that
explicit left side, the ``resolve_status`` join was ambiguous and SQLAlchemy
raised ``InvalidRequestError: Don't know how to join to <Mapper; Status>``.
These tests exercise the real session against the container database so the
status name/colour resolution is proven end to end.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.status.models.status import Status, Statusable
from app.shared.status.repositories import statusable_repository

pytestmark = [pytest.mark.integration, pytest.mark.xdist_group("db")]


@pytest.fixture()
async def active_status(db_session: AsyncSession) -> Status:
    """Persist a ``general/active`` status row to resolve against.

    Args:
        db_session: Test session bound to the container database.

    Returns:
        The persisted :class:`Status` row.
    """
    status = Status(name="active", slug="statusable-repo-active", category="general", color_token="green")
    db_session.add(status)
    await db_session.commit()
    return status


async def _assign(db: AsyncSession, status_id: int, statusable_type: str, statusable_id: int) -> None:
    """Attach *status_id* to the given statusable entity.

    Args:
        db: Active async database session.
        status_id: Primary key of the status to attach.
        statusable_type: Polymorphic statusable type discriminator.
        statusable_id: Id of the statusable entity.
    """
    db.add(Statusable(status_id=status_id, statusable_type=statusable_type, statusable_id=statusable_id))
    await db.commit()


async def test_resolve_status_returns_name_and_color(db_session: AsyncSession, active_status: Status) -> None:
    """An assigned status resolves to its ``(name, color_token)`` tuple."""
    await _assign(db_session, active_status.id, "users", 42)

    assert await statusable_repository.resolve_status(db_session, "users", 42) == ("active", "green")


async def test_resolve_status_returns_none_when_unassigned(db_session: AsyncSession, active_status: Status) -> None:
    """An entity without a status assignment resolves to ``None``."""
    assert await statusable_repository.resolve_status(db_session, "users", 4242) is None


async def test_resolve_status_map_returns_mapping_for_assigned_ids(
    db_session: AsyncSession, active_status: Status
) -> None:
    """The batch resolver maps each assigned id and skips unassigned ones."""
    await _assign(db_session, active_status.id, "users", 1)
    await _assign(db_session, active_status.id, "users", 2)

    assert await statusable_repository.resolve_status_map(db_session, "users", [1, 2, 3]) == {
        1: ("active", "green"),
        2: ("active", "green"),
    }


async def test_resolve_status_map_returns_empty_for_empty_ids(db_session: AsyncSession) -> None:
    """An empty id list short-circuits to an empty mapping."""
    assert await statusable_repository.resolve_status_map(db_session, "users", []) == {}


async def test_set_status_creates_junction_readable_by_get_status(
    db_session: AsyncSession, active_status: Status
) -> None:
    """Assigning a status persists a junction row ``get_status`` reads back."""
    await statusable_repository.set_status(db_session, "users", 7, active_status.id)

    junction = await statusable_repository.get_status(db_session, "users", 7)

    assert junction is not None
    assert junction.status_id == active_status.id
    assert junction.status.name == "active"


async def test_set_status_replaces_existing_assignment(db_session: AsyncSession, active_status: Status) -> None:
    """Re-assigning a status replaces the previous junction row."""
    other = Status(name="inactive", slug="statusable-repo-inactive", category="general", color_token="gray")
    db_session.add(other)
    await db_session.commit()

    await statusable_repository.set_status(db_session, "users", 8, active_status.id)
    await statusable_repository.set_status(db_session, "users", 8, other.id)

    junction = await statusable_repository.get_status(db_session, "users", 8)
    assert junction is not None
    assert junction.status_id == other.id


async def test_clear_status_removes_assignment(db_session: AsyncSession, active_status: Status) -> None:
    """Clearing a status removes the junction row."""
    await statusable_repository.set_status(db_session, "users", 9, active_status.id)

    await statusable_repository.clear_status(db_session, "users", 9)

    assert await statusable_repository.get_status(db_session, "users", 9) is None


async def test_get_status_record_returns_none_when_unassigned(db_session: AsyncSession) -> None:
    """An unassigned statusable has no resolved record."""
    assert await statusable_repository.get_status_record(db_session, "users", 9999) is None


async def test_get_usage_count_counts_assignments(db_session: AsyncSession, active_status: Status) -> None:
    """The usage count reflects the number of linked statusables."""
    await statusable_repository.set_status(db_session, "users", 1, active_status.id)
    await statusable_repository.set_status(db_session, "users", 2, active_status.id)

    assert await statusable_repository.get_usage_count(db_session, active_status.id) == 2
