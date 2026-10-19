"""Integration tests for ``contact_retention_service`` (real Postgres).

Covers the spam-retention purge window (PII retention): only old flagged rows
are dropped, recent spam and ham are kept.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.contact.models.contact_submission import ContactSubmission
from app.contact.services import contact_retention_service, contact_submission_service

pytestmark = [pytest.mark.integration, pytest.mark.xdist_group("db")]


async def test_purge_spam_removes_only_old_flagged_rows(db_session: AsyncSession) -> None:
    """The retention purge drops old spam but keeps recent spam and ham."""
    now = datetime.now(UTC)
    db_session.add_all(
        [
            ContactSubmission(
                name="old-spam",
                email="os@example.com",
                message="m",
                is_spam=True,
                spam_reason="honeypot",
                created_at=now - timedelta(days=40),
            ),
            ContactSubmission(
                name="recent-spam",
                email="rs@example.com",
                message="m",
                is_spam=True,
                spam_reason="honeypot",
                created_at=now - timedelta(days=1),
            ),
            ContactSubmission(
                name="old-legit",
                email="ol@example.com",
                message="m",
                is_spam=False,
                created_at=now - timedelta(days=40),
            ),
        ]
    )
    await db_session.commit()

    deleted = await contact_retention_service.purge_spam_older_than(db_session, days=30)

    assert deleted == 1
    remaining = await contact_submission_service.list_submissions(db_session)
    assert {submission.name for submission in remaining} == {"recent-spam", "old-legit"}
