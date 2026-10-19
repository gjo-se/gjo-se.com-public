"""Unit tests for the contact notification senders (best-effort email + push).

The notification facade is replaced by a capture double so the payload shaping
and the never-raise contract are verified without external I/O.
"""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from app.contact.schemas.contact_submission_schemas import ContactSubmissionCreate
from app.contact.services import contact_notification_service

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Override the suite-wide schema bootstrap (unit test without DB)."""
    return


class _FakeNotificationService:
    """Capture double for the notification facade."""

    def __init__(self) -> None:
        self.send_email = AsyncMock()
        self.send_push = AsyncMock()


def _install(monkeypatch: pytest.MonkeyPatch) -> _FakeNotificationService:
    """Install a capture double as the resolved notification facade."""
    fake = _FakeNotificationService()
    monkeypatch.setattr(contact_notification_service, "get_notification_service", lambda: fake)
    return fake


def _payload() -> ContactSubmissionCreate:
    """Build a plausible submission payload."""
    return ContactSubmissionCreate(
        name="Erika Mustermann",
        email="erika@example.com",
        message="Ich habe eine Frage.",
        lang="de",
    )


async def test_send_autoresponder_targets_the_requester(monkeypatch: pytest.MonkeyPatch) -> None:
    """The autoresponder goes to the requester with the localized template."""
    fake = _install(monkeypatch)

    await contact_notification_service.send_autoresponder(submission_id=7, payload=_payload())

    fake.send_email.assert_awaited_once()
    _args, kwargs = fake.send_email.call_args
    assert kwargs["template"] == "autoresponder_de"
    assert kwargs["recipient"] == "erika@example.com"


async def test_send_notify_sends_email_and_push(monkeypatch: pytest.MonkeyPatch) -> None:
    """The admin notify sends both an email and a push."""
    fake = _install(monkeypatch)

    await contact_notification_service.send_notify(submission_id=7, payload=_payload())

    fake.send_email.assert_awaited_once()
    fake.send_push.assert_awaited_once()
    _args, kwargs = fake.send_push.call_args
    assert kwargs["feature"] == "contact"


async def test_send_notify_swallows_send_failures(monkeypatch: pytest.MonkeyPatch) -> None:
    """A failing sender is logged, never raised (best-effort contract)."""
    fake = _install(monkeypatch)
    fake.send_email.side_effect = RuntimeError("smtp down")
    fake.send_push.side_effect = RuntimeError("push down")

    # Must not raise despite both senders failing.
    await contact_notification_service.send_notify(submission_id=7, payload=_payload())

    fake.send_email.assert_awaited_once()
    fake.send_push.assert_awaited_once()
