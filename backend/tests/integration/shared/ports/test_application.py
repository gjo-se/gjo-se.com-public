"""Unit tests for the shared application-bridge port."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.http.exceptions import HttpStatusError
from app.shared.ports.application import (
    ApplicationBridgePort,
    SubmissionMoveConflictError,
    get_application_bridge_port,
)

pytestmark = pytest.mark.integration


class _AppBridge:
    """Structural implementation of the application-bridge port."""

    async def move_submission(self, db: AsyncSession, *, from_project_id: int, to_project_id: int) -> bool:
        """Return a fixed move result."""
        return True

    async def get_profile_base_rate(self, db: AsyncSession) -> float | None:
        """Return a fixed base rate."""
        return 80.0


def test_application_bridge_fake_satisfies_protocol() -> None:
    """An object with the contract methods satisfies the runtime protocol."""
    assert isinstance(_AppBridge(), ApplicationBridgePort)


def test_submission_move_conflict_error_defaults_to_409() -> None:
    """The port exception carries an HTTP-near 409 status."""
    error = SubmissionMoveConflictError("target busy")

    assert error.status_code == 409
    assert isinstance(error, HttpStatusError)


async def test_get_application_bridge_port_returns_wired_port() -> None:
    """The composition root wires a concrete application-bridge port."""
    assert isinstance(await get_application_bridge_port(), ApplicationBridgePort)
