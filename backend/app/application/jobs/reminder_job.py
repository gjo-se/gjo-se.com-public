"""Communication reminder – cron job for overdue follow-ups.

Runs every 15 minutes: queries ``application_communication`` for entries
where ``follow_up_date <= now()`` AND ``follow_up_done = false``,
then sends a push (ntfy) and email notification for each match via the
notification facade (``feature="reminder"``).
"""

from datetime import UTC, datetime

import structlog
from sqlalchemy import select

from app.application.models.communication import Communication
from app.shared.config.config import settings
from app.shared.db_access.session import AsyncSessionLocal
from app.shared.notification.dependencies.notification_dependencies import get_notification_service

logger = structlog.get_logger("communication_reminder")


async def _send_reminder(comm: Communication) -> None:
    """Send push + email for one overdue follow-up.

    Each channel is fault-isolated: a failed push or email is logged and does
    not abort the other channel or the remaining entries.
    """
    comm_url = f"{settings.FRONTEND_URL}/admin/application-submissions/{comm.application_submission_id}"
    context: dict[str, object] = {
        "subject": comm.subject,
        "date": str(comm.date),
        "type": str(comm.type),
        "summary": comm.summary or "–",
        "next_steps": comm.next_steps or "–",
        "url": comm_url,
    }

    try:
        summary = (comm.summary or "")[:200]
        await get_notification_service().send_push(
            title=comm.subject or "Wiedervorlage",
            message=summary or (comm.subject or "Wiedervorlage"),
            url=comm_url,
            feature="reminder",
        )
    except Exception:
        logger.exception(
            "Push für Communication #%d fehlgeschlagen",
            comm.id,
        )

    try:
        await get_notification_service().send_email(
            feature="reminder",
            template="reminder",
            context=context,
        )
    except Exception:
        logger.exception(
            "E-Mail für Communication #%d fehlgeschlagen",
            comm.id,
        )

    logger.info("Reminder für Communication #%d gesendet", comm.id)


async def run_reminder_job() -> None:
    """Scheduled job: find overdue follow-ups and send notifications.

    Queries ``application_communication`` for entries where
    ``follow_up_date`` is in the past and ``follow_up_done`` is still
    ``false``. For each match, sends a push and an email via the
    notification facade (``feature="reminder"``); the email is rendered
    from the ``reminder`` template.

    Errors are logged per-entry – a single failed notification does not
    block the remaining entries.
    """
    async with AsyncSessionLocal() as db:
        now = datetime.now(tz=UTC)
        stmt = select(Communication).where(
            Communication.follow_up_done.is_(False),
            Communication.follow_up_date <= now,
            Communication.follow_up_date.is_not(None),
        )
        result = await db.execute(stmt)
        overdue = list(result.scalars().all())

    if not overdue:
        logger.debug("Keine fälligen Wiedervorlagen gefunden.")
        return

    logger.info("%d fällige Wiedervorlagen gefunden.", len(overdue))

    for comm in overdue:
        await _send_reminder(comm)
