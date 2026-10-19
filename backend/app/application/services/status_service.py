"""Vorgangs-Status-Lebenszyklus für ApplicationSubmissions (gjo_se_com).

Setzt den Status eines Bewerbungsvorgangs über ``core_statusable`` und erzwingt
dabei einen definierten Lebenszyklus. ``sent`` (Versand) und ``failed``
(Fehler/Retry) bleiben systemverwaltet und sind keine Ziele dieses Services.

Übergangs-Matrix (current → erlaubte Ziele)::

    draft     → {withdrawn}
    sent      → {replied, interview, offer, rejected, withdrawn}
    replied   → {interview, offer, rejected, withdrawn}
    interview → {offer, rejected, withdrawn}
    offer     → {rejected, withdrawn}
    failed    → {withdrawn}
    rejected  → frozenset()
    withdrawn → frozenset()

Ist noch kein Status gesetzt (``current is None``), ist ausschließlich ``draft``
als Erstinitialisierung erlaubt.
"""

import structlog

from app.application.exceptions import ApplicationStatusTransitionError
from app.shared.db_access.session_types import AsyncSession
from app.shared.status.repositories import status_repository, statusable_repository

logger = structlog.get_logger(__name__)

_STATUSABLE_TYPE = "application_submission"
_CATEGORY = "application"
_DRAFT_STATUS = "draft"

ALLOWED_TRANSITIONS: dict[str, frozenset[str]] = {
    "draft": frozenset({"withdrawn"}),
    "sent": frozenset({"replied", "interview", "offer", "rejected", "withdrawn"}),
    "replied": frozenset({"interview", "offer", "rejected", "withdrawn"}),
    "interview": frozenset({"offer", "rejected", "withdrawn"}),
    "offer": frozenset({"rejected", "withdrawn"}),
    "failed": frozenset({"withdrawn"}),
    "rejected": frozenset(),
    "withdrawn": frozenset(),
}


async def set_submission_status(db: AsyncSession, *, submission_id: int, target_name: str) -> None:
    """Sets a submission's status, enforcing the lifecycle transitions.

    Args:
        db: Active gjo_se_com DB session.
        submission_id: The application_submission id.
        target_name: Target status name (category ``application``).

    Raises:
        ApplicationStatusTransitionError: If the target status is unknown (422)
            or the transition is not allowed (409).
    """
    target = await status_repository.get_by_name_and_category(db, target_name, _CATEGORY)
    if target is None:
        raise ApplicationStatusTransitionError(f"Status '{target_name}' ist unbekannt", status_code=422)

    row = await statusable_repository.get_status(db, _STATUSABLE_TYPE, submission_id)
    current = row.status.name if row is not None else None

    if current is None:
        if target_name != _DRAFT_STATUS:
            logger.warning(
                "application_status: rejected transition (submission_id=%s, current=None, target=%s)",
                submission_id,
                target_name,
            )
            raise ApplicationStatusTransitionError(
                f"Status '{target_name}' ist ohne vorherigen Status nicht erlaubt", status_code=409
            )
    elif target_name not in ALLOWED_TRANSITIONS.get(current, frozenset()):
        logger.warning(
            "application_status: rejected transition (submission_id=%s, current=%s, target=%s)",
            submission_id,
            current,
            target_name,
        )
        raise ApplicationStatusTransitionError(
            f"Übergang '{current}' → '{target_name}' ist nicht erlaubt", status_code=409
        )

    await statusable_repository.set_status(db, _STATUSABLE_TYPE, submission_id, target.id)
    logger.info(
        "application_status: status set (submission_id=%s, current=%s, target=%s)",
        submission_id,
        current,
        target_name,
    )
