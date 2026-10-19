"""Unit tests for the AsyncSession consumer mixin."""

from __future__ import annotations

from typing import cast

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access.db_consumer import DatabaseConsumer

pytestmark = pytest.mark.integration


class _Consumer(DatabaseConsumer):
    """Concrete consumer exposing the stored session via a public accessor."""

    def session(self) -> AsyncSession:
        """Return the injected session (observable behaviour of the mixin)."""
        return self._db


def test_database_consumer_stores_injected_session() -> None:
    """The mixin makes the session available to the subclass."""
    session = cast(AsyncSession, object())

    consumer = _Consumer(session)

    assert consumer.session() is session
