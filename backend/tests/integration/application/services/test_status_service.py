"""Integration tests for the submission status lifecycle service (real Postgres).

Covers the enforced transition matrix: the first status must be ``draft``,
unknown targets are rejected and only the allowed transitions succeed.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.exceptions import ApplicationStatusTransitionError
from app.application.services import status_service
from app.shared.status.models.status import Status
from app.shared.status.repositories import status_repository, statusable_repository

pytestmark = pytest.mark.integration


async def _status(db: AsyncSession, name: str) -> Status:
    """Persist an application status with the given name."""
    return await status_repository.create(
        db, Status(name=name, slug=f"test-app-{name}", category="application", color_token="blue")
    )


async def test_unknown_target_status_is_rejected(db_session: AsyncSession) -> None:
    """A target status that does not exist is rejected with 422."""
    with pytest.raises(ApplicationStatusTransitionError) as exc:
        await status_service.set_submission_status(db_session, submission_id=1, target_name="does_not_exist")

    assert exc.value.status_code == 422


async def test_first_status_must_be_draft(db_session: AsyncSession) -> None:
    """Without a current status only ``draft`` may be initialised."""
    await _status(db_session, "sent")

    with pytest.raises(ApplicationStatusTransitionError) as exc:
        await status_service.set_submission_status(db_session, submission_id=1, target_name="sent")

    assert exc.value.status_code == 409


async def test_first_status_draft_is_accepted(db_session: AsyncSession) -> None:
    """``draft`` initialises a submission without a previous status."""
    await _status(db_session, "draft")

    await status_service.set_submission_status(db_session, submission_id=1, target_name="draft")

    row = await statusable_repository.get_status(db_session, "application_submission", 1)
    assert row is not None
    assert row.status.name == "draft"


async def test_draft_cannot_jump_to_sent(db_session: AsyncSession) -> None:
    """``draft → sent`` is not part of the matrix and is rejected."""
    draft = await _status(db_session, "draft")
    await _status(db_session, "sent")
    await statusable_repository.set_status(db_session, "application_submission", 1, draft.id)

    with pytest.raises(ApplicationStatusTransitionError) as exc:
        await status_service.set_submission_status(db_session, submission_id=1, target_name="sent")

    assert exc.value.status_code == 409


async def test_draft_can_be_withdrawn(db_session: AsyncSession) -> None:
    """``draft → withdrawn`` is allowed."""
    draft = await _status(db_session, "draft")
    withdrawn = await _status(db_session, "withdrawn")
    await statusable_repository.set_status(db_session, "application_submission", 1, draft.id)

    await status_service.set_submission_status(db_session, submission_id=1, target_name="withdrawn")

    row = await statusable_repository.get_status(db_session, "application_submission", 1)
    assert row is not None
    assert row.status.id == withdrawn.id


async def test_sent_can_transition_to_replied(db_session: AsyncSession) -> None:
    """``sent → replied`` is an allowed lifecycle step."""
    sent = await _status(db_session, "sent")
    replied = await _status(db_session, "replied")
    await statusable_repository.set_status(db_session, "application_submission", 1, sent.id)

    await status_service.set_submission_status(db_session, submission_id=1, target_name="replied")

    row = await statusable_repository.get_status(db_session, "application_submission", 1)
    assert row is not None
    assert row.status.id == replied.id
