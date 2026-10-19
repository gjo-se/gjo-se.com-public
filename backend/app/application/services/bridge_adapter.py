"""application adapter for the shared application-bridge port (import-linter Group F).

Implements :class:`app.shared.ports.application.ApplicationBridgePort` on top of
the application services so the fbf context can move submissions and read the
profile base rate without importing ``app.application``. Wired at the
composition root (``app/main.py``).
"""

from __future__ import annotations

from app.application.exceptions import ApplicationPrepareError
from app.application.repositories import profile_repository
from app.application.services import submission_service
from app.shared.db_access.session_types import AsyncSession
from app.shared.ports.application import SubmissionMoveConflictError


class ApplicationBridgeAdapter:
    """Application capabilities consumed by the fbf context."""

    async def move_submission(self, db: AsyncSession, *, from_project_id: int, to_project_id: int) -> bool:
        """Move the source project's current submission to the target project.

        Raises:
            SubmissionMoveConflictError: If the target already has a current
                submission.
        """
        try:
            return await submission_service.move_to_project(
                db, from_project_id=from_project_id, to_project_id=to_project_id
            )
        except ApplicationPrepareError as exc:
            raise SubmissionMoveConflictError(str(exc), status_code=exc.status_code) from exc

    async def get_profile_base_rate(self, db: AsyncSession) -> float | None:
        """Return the application profile base hourly rate, or ``None`` when unset."""
        profile = await profile_repository.get_profile(db)
        if profile is None or profile.hourly_rate is None:
            return None
        return float(profile.hourly_rate)
