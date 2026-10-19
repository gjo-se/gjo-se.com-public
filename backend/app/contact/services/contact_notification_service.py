"""Best-effort email/push notifications for contact form submissions.

The senders are scheduled by :func:`app.contact.services.contact_submission_service.create_submission`
on FastAPI ``BackgroundTasks``. Failures are logged, never raised – the
persisted submission stays the source of truth / admin fallback.
"""

import structlog

from app.contact.schemas.contact_submission_schemas import ContactSubmissionCreate
from app.shared.config.config import settings
from app.shared.notification.dependencies.notification_dependencies import get_notification_service

logger = structlog.get_logger(__name__)


async def send_autoresponder(*, submission_id: int, payload: ContactSubmissionCreate) -> None:
    """Send the localized autoresponder to the requester (best-effort)."""
    template = f"autoresponder_{payload.lang}"
    try:
        await get_notification_service().send_email(
            feature="contact",
            template=template,
            context={"name": payload.name, "message": payload.message},
            recipient=payload.email,
        )
    except Exception:
        logger.exception(
            "contact: autoresponder send failed",
            submission_id=submission_id,
            email=payload.email,
            template=template,
        )


async def send_notify(*, submission_id: int, payload: ContactSubmissionCreate) -> None:
    """Notify Greg about the submission (best-effort).

    Sends an email (recipient from ``config.email_recipient``) and a push
    (via ``config.ntfy_topic``). Both are best-effort and independent –
    failures are logged, never raised.
    """
    try:
        await get_notification_service().send_email(
            feature="contact",
            template="notify",
            context={
                "name": payload.name,
                "email": payload.email,
                "message": payload.message,
                "page": payload.page,
            },
        )
    except Exception:
        logger.exception(
            "contact: notify send failed",
            submission_id=submission_id,
            email=payload.email,
            template="notify",
        )

    try:
        await get_notification_service().send_push(
            title="Neue Kontaktanfrage",
            message=f"{payload.name} ({payload.email}): {payload.message[:200]}",
            url=f"{settings.FRONTEND_URL}/admin/contact",
            feature="contact",
        )
    except Exception:
        logger.exception(
            "contact: notify push failed",
            submission_id=submission_id,
            email=payload.email,
        )
