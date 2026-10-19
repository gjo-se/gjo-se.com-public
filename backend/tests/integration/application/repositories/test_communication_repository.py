"""Integration tests for the communication repository (real Postgres)."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.models.submission import Submission
from app.application.repositories import communication_repository
from app.application.schemas.communication_schemas import CommunicationOut

pytestmark = pytest.mark.integration


async def _comm(db: AsyncSession, submission: Submission, *, subject: str, when: datetime) -> CommunicationOut:
    """Persist one outbound communication for the submission at the given time."""
    return await communication_repository.create_outbound(
        db,
        submission.id,
        subject,
        "Zusammenfassung",
        date=when,
    )


async def test_create_and_get_by_id_round_trips(db_session: AsyncSession, app_submission: Submission) -> None:
    """A created communication is readable by its id."""
    created = await _comm(db_session, app_submission, subject="Anruf", when=datetime(2026, 1, 1, tzinfo=UTC))

    fetched = await communication_repository.get_by_id(db_session, created.id)

    assert fetched is not None
    assert fetched.subject == "Anruf"


async def test_get_by_id_returns_none_for_unknown_id(db_session: AsyncSession) -> None:
    """An unknown id yields ``None``."""
    assert await communication_repository.get_by_id(db_session, 999_999) is None


async def test_list_by_submission_orders_newest_first(db_session: AsyncSession, app_submission: Submission) -> None:
    """The history is ordered by ``date`` descending."""
    await _comm(db_session, app_submission, subject="Alt", when=datetime(2025, 1, 1, tzinfo=UTC))
    await _comm(db_session, app_submission, subject="Neu", when=datetime(2026, 1, 1, tzinfo=UTC))

    rows = await communication_repository.list_by_submission(db_session, app_submission.id)

    assert [row.subject for row in rows] == ["Neu", "Alt"]


async def test_list_by_submission_scopes_to_the_submission(
    db_session: AsyncSession, app_submission: Submission
) -> None:
    """Only communications of the requested submission are returned."""
    await _comm(db_session, app_submission, subject="A", when=datetime(2026, 1, 1, tzinfo=UTC))

    assert await communication_repository.list_by_submission(db_session, app_submission.id + 1) == []


async def test_update_persists_field_changes(db_session: AsyncSession, app_submission: Submission) -> None:
    """Changes to a communication are flushed and readable."""
    comm = await _comm(db_session, app_submission, subject="Alt", when=datetime(2026, 1, 1, tzinfo=UTC))

    await communication_repository.update_fields(db_session, comm.id, {"summary": "Neue Zusammenfassung"})

    fetched = await communication_repository.get_by_id(db_session, comm.id)
    assert fetched is not None
    assert fetched.summary == "Neue Zusammenfassung"


async def test_delete_removes_the_communication(db_session: AsyncSession, app_submission: Submission) -> None:
    """A deleted communication is gone afterwards."""
    comm = await _comm(db_session, app_submission, subject="Weg", when=datetime(2026, 1, 1, tzinfo=UTC))

    await communication_repository.delete_by_id(db_session, comm.id)

    assert await communication_repository.get_by_id(db_session, comm.id) is None
