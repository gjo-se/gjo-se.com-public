"""Unit tests for the CRM contact project-link move adapter component."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from app.crm.services import contact_link_adapter
from app.crm.services.contact_link_adapter import CrmContactLinkMover

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


async def test_move_project_links_delegates_and_returns_count(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The link move delegates to the project-person service and returns its count."""
    move = AsyncMock(return_value=3)
    monkeypatch.setattr(contact_link_adapter.project_person_service, "move_links", move)
    db = AsyncMock()

    moved = await CrmContactLinkMover().move_project_links(db, from_project_id=1, to_project_id=2)

    assert moved == 3
    move.assert_awaited_once_with(db, 1, 2)
