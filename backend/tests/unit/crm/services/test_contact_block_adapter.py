"""Unit tests for the CRM contact block adapter component."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from app.crm.services import contact_block_adapter
from app.crm.services.contact_block_adapter import CrmContactBlockChecks

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


async def test_assert_person_not_blocked_delegates_to_the_service(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The check delegates to the CRM contact-block service with the same args."""
    check = AsyncMock()
    monkeypatch.setattr(contact_block_adapter.contact_block_service, "assert_person_id_not_blocked", check)
    db = AsyncMock()

    await CrmContactBlockChecks().assert_person_not_blocked(db, 7)

    check.assert_awaited_once_with(db, 7)
