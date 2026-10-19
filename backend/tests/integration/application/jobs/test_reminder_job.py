"""Integration tests for the communication reminder cron job.

``AsyncSessionLocal`` and the notification facade are replaced so the job's
overdue query and its fault-isolated push/email dispatch can be exercised
against the real database without an external transport.
"""

from __future__ import annotations

from contextlib import AbstractAsyncContextManager
from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.jobs import reminder_job
from app.application.models.communication import Communication
from app.application.models.submission import Submission

pytestmark = pytest.mark.integration


class _FakeNotification:
    """Records push/email sends; optionally lets ``send_push`` fail."""

    def __init__(self, *, fail_push: bool = False) -> None:
        """Configure whether the push channel raises."""
        self.pushes: list[dict[str, Any]] = []
        self.emails: list[dict[str, Any]] = []
        self._fail_push = fail_push

    async def send_push(self, **kwargs: Any) -> None:
        """Record a push, or raise to exercise fault isolation."""
        if self._fail_push:
            raise RuntimeError("push down")
        self.pushes.append(kwargs)

    async def send_email(self, **kwargs: Any) -> None:
        """Record an email."""
        self.emails.append(kwargs)


class _SessionScope(AbstractAsyncContextManager[AsyncSession]):
    """Async context manager yielding the shared test session."""

    def __init__(self, session: AsyncSession) -> None:
        """Wrap the session."""
        self._session = session

    async def __aenter__(self) -> AsyncSession:
        """Yield the wrapped session."""
        return self._session

    async def __aexit__(self, *exc: object) -> bool:
        """Do not suppress exceptions."""
        return False


@pytest.fixture()
def fake_notification(monkeypatch: pytest.MonkeyPatch) -> _FakeNotification:
    """Replace the notification facade with a recording fake."""
    fake = _FakeNotification()
    monkeypatch.setattr(reminder_job, "get_notification_service", lambda: fake)
    return fake


async def test_run_reminder_job_notifies_only_overdue_open_follow_ups(
    db_session: AsyncSession,
    app_submission: Submission,
    fake_notification: _FakeNotification,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Only overdue, not-yet-done follow-ups trigger a push and an email."""
    monkeypatch.setattr(reminder_job, "AsyncSessionLocal", lambda: _SessionScope(db_session))
    db_session.add(
        Communication(
            application_submission_id=app_submission.id,
            subject="Überfällig",
            follow_up_date=datetime(2020, 1, 1, tzinfo=UTC),
            follow_up_done=False,
        )
    )
    db_session.add(
        Communication(
            application_submission_id=app_submission.id,
            subject="Zukunft",
            follow_up_date=datetime(2099, 1, 1, tzinfo=UTC),
            follow_up_done=False,
        )
    )
    db_session.add(
        Communication(
            application_submission_id=app_submission.id,
            subject="Erledigt",
            follow_up_date=datetime(2020, 1, 1, tzinfo=UTC),
            follow_up_done=True,
        )
    )
    await db_session.flush()

    await reminder_job.run_reminder_job()

    assert [push["title"] for push in fake_notification.pushes] == ["Überfällig"]
    assert len(fake_notification.emails) == 1


async def test_run_reminder_job_is_a_noop_without_overdue_rows(
    db_session: AsyncSession,
    fake_notification: _FakeNotification,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Without overdue rows no notification is sent."""
    monkeypatch.setattr(reminder_job, "AsyncSessionLocal", lambda: _SessionScope(db_session))

    await reminder_job.run_reminder_job()

    assert fake_notification.pushes == []
    assert fake_notification.emails == []


async def test_send_reminder_isolates_a_failed_push_from_the_email(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A failing push does not block the email channel."""
    failing = _FakeNotification(fail_push=True)
    monkeypatch.setattr(reminder_job, "get_notification_service", lambda: failing)
    comm = SimpleNamespace(
        id=1,
        application_submission_id=2,
        subject="Thema",
        date=datetime(2026, 1, 1, tzinfo=UTC),
        type="note",
        summary="Zusammenfassung",
        next_steps="Nachfassen",
    )

    await reminder_job._send_reminder(comm)

    assert failing.pushes == []
    assert len(failing.emails) == 1
    assert failing.emails[0]["feature"] == "reminder"
