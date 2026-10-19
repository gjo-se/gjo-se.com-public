"""Unit test for the scheduled contact-spam purge job wrapper."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock

import pytest

from app.contact.jobs.contact_spam_purge_job import purge_contact_spam

pytestmark = pytest.mark.integration


class _SessionContext:
    """Async context manager double yielding a sentinel session."""

    def __init__(self, session: object) -> None:
        self._session = session

    async def __aenter__(self) -> object:
        return self._session

    async def __aexit__(self, *exc: Any) -> bool:
        return False


async def test_purge_contact_spam_delegates_to_retention(monkeypatch: pytest.MonkeyPatch) -> None:
    """The job runs the retention purge on a fresh session."""
    session = object()
    purge = AsyncMock(return_value=2)
    monkeypatch.setattr(
        "app.contact.services.contact_retention_service.purge_spam_older_than",
        purge,
    )
    monkeypatch.setattr("app.shared.db_access.session.AsyncSessionLocal", lambda: _SessionContext(session))

    await purge_contact_spam()

    purge.assert_awaited_once_with(session)
