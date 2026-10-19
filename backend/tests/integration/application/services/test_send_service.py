"""Integration tests for the submission send/retry service (real Postgres)."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.exceptions import ApplicationSendError
from app.application.models.submission import Submission
from app.application.services import send_service
from app.shared.status.models.status import Status
from app.shared.status.repositories import status_repository, statusable_repository

pytestmark = pytest.mark.integration


async def test_send_rejects_reserved_recipient_before_transport(
    db_session: AsyncSession, app_submission: Submission
) -> None:
    """A reserved (non-deliverable) recipient aborts the send before any tracing."""
    with pytest.raises(ApplicationSendError, match="Platzhalter"):
        await send_service.send_submission(db_session, app_submission, catalog=None)


async def test_retry_rejects_a_submission_without_failed_status(
    db_session: AsyncSession, app_submission: Submission
) -> None:
    """A submission without any status is not retryable."""
    with pytest.raises(ApplicationSendError, match="fehlgeschlagene"):
        await send_service.retry_submission(db_session, app_submission, catalog=None)


async def test_retry_rejects_a_submission_in_a_non_failed_status(
    db_session: AsyncSession, app_submission: Submission
) -> None:
    """Only a ``failed`` submission may be retried."""
    sent = await status_repository.create(
        db_session, Status(name="sent", slug="test-send-sent", category="application", color_token="green")
    )
    await statusable_repository.set_status(db_session, "application_submission", app_submission.id, sent.id)

    with pytest.raises(ApplicationSendError):
        await send_service.retry_submission(db_session, app_submission, catalog=None)
