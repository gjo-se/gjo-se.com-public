"""Shared-owned application-bridge port (import-linter Group F).

The ``app.fbf`` context must not import ``app.application`` internals (the
``independence`` contract forbids direct imports). Where fbf needs application
capabilities (moving an application submission on a master switch, reading the
profile base rate for the hourly-rate estimate), it depends on the
:class:`ApplicationBridgePort` protocol.

The application context provides the concrete implementation; it is wired at
the composition root (``app/main.py``) via ``app.dependency_overrides``.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.http.exceptions import HttpStatusError


class SubmissionMoveConflictError(HttpStatusError):
    """Raised when a submission cannot be moved to the target project.

    Carries an HTTP-near ``status_code`` (default 409) so the fbf router can map
    it to a response without importing the application exception type.
    """

    status_code = 409


@runtime_checkable
class ApplicationBridgePort(Protocol):
    """Application capabilities the fbf context needs."""

    async def move_submission(self, db: AsyncSession, *, from_project_id: int, to_project_id: int) -> bool:
        """Move the source project's current submission to the target project.

        Returns ``True`` when a submission was re-pointed, ``False`` when the
        source had none.

        Raises:
            SubmissionMoveConflictError: If the target already has a current
                submission.
        """
        ...

    async def get_profile_base_rate(self, db: AsyncSession) -> float | None:
        """Return the application profile base hourly rate, or ``None`` when unset."""
        ...


_PORT: dict[str, ApplicationBridgePort] = {}


def register_application_bridge_port(port: ApplicationBridgePort) -> None:
    """Register the concrete application-bridge port (composition root).

    Called once from ``app/main.py``. Enables direct (non-HTTP) resolution of the
    port, e.g. from services invoked without a FastAPI request.
    """
    _PORT["instance"] = port


async def get_application_bridge_port() -> ApplicationBridgePort:
    """Resolve the application-bridge port.

    The concrete implementation lives in the application context and is
    registered at the composition root (``app/main.py``). Without that wiring the
    port fails closed.

    Returns:
        The wired application-bridge port.

    Raises:
        HTTPException 503: The application-bridge port is not wired.
    """
    port = _PORT.get("instance")
    if port is not None:
        return port
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Application bridge port is not wired",
    )
