"""Integration tests for the contact submission service.

Covers the persist-first flow, the honeypot/token/content spam classification,
best-effort email scheduling, listing/deletion and the spam-purge retention
window against the real Postgres test database.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi import BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.contact.models.contact_submission import ContactSubmission
from app.contact.schemas.contact_submission_schemas import ContactSubmissionCreate
from app.contact.services import contact_submission_service, contact_token_service

pytestmark = [pytest.mark.integration, pytest.mark.xdist_group("db")]

T0 = datetime(2026, 1, 1, tzinfo=UTC)


def _legit_payload(token: str) -> ContactSubmissionCreate:
    """Return a plausible human submission carrying *token*."""
    return ContactSubmissionCreate(
        name="Erika Mustermann",
        email="erika@example.com",
        message="Ich habe eine Frage zu Ihrem Angebot.",
        token=token,
    )


async def test_create_legitimate_submission_persists_and_schedules_emails(
    db_session: AsyncSession,
    frozen_time: Any,
) -> None:
    """A valid submission is stored as ham and schedules autoresponder + notify."""
    with frozen_time(T0):
        token, _ = contact_token_service.issue_token()
    background_tasks = BackgroundTasks()

    with frozen_time(T0 + timedelta(seconds=3)):
        submission = await contact_submission_service.create_submission(
            db_session, _legit_payload(token), background_tasks, client_ip="203.0.113.7"
        )

    assert submission.id is not None
    assert submission.is_spam is False
    assert submission.spam_reason is None
    assert submission.ip == "203.0.113.7"
    assert len(background_tasks.tasks) == 2


async def test_create_submission_with_filled_honeypot_flags_spam(db_session: AsyncSession) -> None:
    """A filled honeypot is persisted as spam and sends no mail."""
    payload = ContactSubmissionCreate(name="Bot", email="bot@example.com", message="hello", honeypot="filled")
    background_tasks = BackgroundTasks()

    submission = await contact_submission_service.create_submission(db_session, payload, background_tasks)

    assert submission.is_spam is True
    assert submission.spam_reason == "honeypot"
    assert background_tasks.tasks == []


async def test_create_submission_with_invalid_token_flags_spam(db_session: AsyncSession) -> None:
    """A missing/forged form token is treated as spam."""
    payload = _legit_payload("not-a-valid-token")

    submission = await contact_submission_service.create_submission(db_session, payload, BackgroundTasks())

    assert submission.is_spam is True
    assert submission.spam_reason == "token"


async def test_create_submission_with_bot_content_flags_spam(
    db_session: AsyncSession,
    frozen_time: Any,
) -> None:
    """Token-like name and message mark a submission as bot content."""
    with frozen_time(T0):
        token, _ = contact_token_service.issue_token()
    payload = ContactSubmissionCreate(
        name="abcdefghij12",
        email="bot@example.com",
        message="klmnopqrst34",
        token=token,
    )

    with frozen_time(T0 + timedelta(seconds=3)):
        submission = await contact_submission_service.create_submission(db_session, payload, BackgroundTasks())

    assert submission.is_spam is True
    assert submission.spam_reason == "content"


async def test_list_submissions_returns_newest_first(db_session: AsyncSession) -> None:
    """Submissions are listed by ``created_at`` descending."""
    db_session.add_all(
        [
            ContactSubmission(name="oldest", email="a@example.com", message="1", created_at=T0),
            ContactSubmission(name="middle", email="b@example.com", message="2", created_at=T0 + timedelta(days=1)),
            ContactSubmission(name="newest", email="c@example.com", message="3", created_at=T0 + timedelta(days=2)),
        ]
    )
    await db_session.commit()

    submissions = await contact_submission_service.list_submissions(db_session)

    assert [submission.name for submission in submissions] == ["newest", "middle", "oldest"]


async def test_delete_submission_returns_false_for_unknown_id(db_session: AsyncSession) -> None:
    """Deleting a non-existent id reports no deletion."""
    assert await contact_submission_service.delete_submission(db_session, 999_999) is False


async def test_delete_submission_removes_row(db_session: AsyncSession) -> None:
    """Deleting an existing id removes the row."""
    submission = ContactSubmission(name="Del", email="del@example.com", message="bye")
    db_session.add(submission)
    await db_session.commit()

    deleted = await contact_submission_service.delete_submission(db_session, submission.id)

    assert deleted is True
    assert await db_session.get(ContactSubmission, submission.id) is None
