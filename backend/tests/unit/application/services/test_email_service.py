"""Unit tests for the application email service.

Covers ``email_service.send_application_email``: it forwards the ready-rendered
context to the central notification facade with the ``("application",
"application")`` template, the optional attachments, sender override and BCC.
The facade is replaced by an in-memory fake (state assertion, no DB, no SMTP).
"""

from __future__ import annotations

from typing import Any

import pytest

from app.application.services import email_service


class _FakeNotificationService:
    """Records the ``send_email`` calls instead of touching a transport."""

    def __init__(self) -> None:
        """Initialize an empty call log."""
        self.sent: list[dict[str, Any]] = []

    async def send_email(self, **kwargs: Any) -> None:
        """Record one send call."""
        self.sent.append(kwargs)


@pytest.fixture()
def fake_notification(monkeypatch: pytest.MonkeyPatch) -> _FakeNotificationService:
    """Replace the notification facade factory with a recording fake."""
    fake = _FakeNotificationService()
    monkeypatch.setattr(email_service, "get_notification_service", lambda: fake)
    return fake


pytestmark = pytest.mark.unit


async def test_send_application_email_returns_sent_status(fake_notification: _FakeNotificationService) -> None:
    """A successful send reports ``{"status": "sent"}``."""
    result = await email_service.send_application_email(recipient="hr@example.test", context={"subject": "Hi"})

    assert result == {"status": "sent"}


async def test_send_application_email_uses_application_template(fake_notification: _FakeNotificationService) -> None:
    """The facade is invoked with the application feature/template pair."""
    await email_service.send_application_email(recipient="hr@example.test", context={"subject": "Hi"})

    call = fake_notification.sent[0]
    assert call["feature"] == "application"
    assert call["template"] == "application"
    assert call["recipient"] == "hr@example.test"
    assert call["context"] == {"subject": "Hi"}


async def test_send_application_email_forwards_attachments_and_overrides(
    fake_notification: _FakeNotificationService,
) -> None:
    """Attachments, sender override and BCC are forwarded verbatim."""
    await email_service.send_application_email(
        recipient="hr@example.test",
        context={"subject": "Hi"},
        from_override="me@example.test",
        bcc=["copy@example.test"],
        pdf_paths=["/tmp/cv.pdf", "/tmp/letter.pdf"],
    )

    call = fake_notification.sent[0]
    assert call["attachments"] == ["/tmp/cv.pdf", "/tmp/letter.pdf"]
    assert call["from_override"] == "me@example.test"
    assert call["bcc"] == ["copy@example.test"]


async def test_send_application_email_without_pdfs_sends_no_attachments(
    fake_notification: _FakeNotificationService,
) -> None:
    """Without PDF paths the attachment payload stays empty."""
    await email_service.send_application_email(recipient="hr@example.test", context={})

    assert fake_notification.sent[0]["attachments"] is None
