"""Service for persisting and notifying contact form submissions (gjo_se_com).

Persist-first flow: every submission is stored as the source of truth before any
email is attempted – including spam, which is persisted with a flag
(``is_spam`` + ``spam_reason``) instead of being silently discarded. Flagged rows
never trigger mails and are purged after ``SPAM_RETENTION_DAYS`` (PII retention);
keeping them makes false positives observable so thresholds can be tuned.

Email delivery is best-effort via the notification facade (scheduled on
``BackgroundTasks``) – failures are logged, never raised, and the submission
stays persisted as an admin fallback.
"""

import re

import structlog
from fastapi import BackgroundTasks

from app.contact.repositories import contact_submission_repository
from app.contact.schemas.contact_submission_schemas import (
    ContactSubmissionAdminOut,
    ContactSubmissionCreate,
)
from app.contact.services import contact_token_service
from app.contact.services.contact_notification_service import send_autoresponder, send_notify
from app.shared.db_access.session_types import AsyncSession

logger = structlog.get_logger(__name__)

#: Spam reasons persisted in ``spam_reason`` – the spam heuristic that fired.
_SPAM_REASON_HONEYPOT = "honeypot"
_SPAM_REASON_TOKEN = "token"
_SPAM_REASON_CONTENT = "content"

#: Matches a pure alphanumeric token (no spaces/special chars) – typical bot content.
_RANDOM_TOKEN_RE = re.compile(r"^[A-Za-z0-9]{10,}$")

#: Minimum dots in the local email part to count as obfuscation (e.g. "w.i.s.ama.la").
_EMAIL_OBFUSCATION_MIN_DOTS = 4


async def create_submission(
    db: AsyncSession,
    payload: ContactSubmissionCreate,
    background_tasks: BackgroundTasks,
    *,
    client_ip: str | None = None,
) -> ContactSubmissionAdminOut:
    """Classify spam, persist the submission and schedule email sends.

    Spam (honeypot filled / missing-invalid token / bot content) is persisted
    with ``is_spam=True`` and a ``spam_reason`` but never triggers emails. The
    caller still answers a neutral 201 so bots get no signal; it should hide the
    stored row for flagged submissions.

    Args:
        db: Active DB session.
        payload: Validated contact submission payload.
        background_tasks: FastAPI background tasks for best-effort email sends.
        client_ip: Client IP at request time (or ``None`` when unavailable),
            persisted purely for internal pattern/block analysis.

    Returns:
        The persisted submission as admin DTO (flagged when spam).
    """
    spam_reason = _spam_reason(payload)

    submission = await contact_submission_repository.create(
        db,
        name=payload.name,
        email=payload.email,
        message=payload.message,
        page=payload.page,
        ip=client_ip,
        lang=payload.lang,
        is_spam=spam_reason is not None,
        spam_reason=spam_reason,
    )

    if spam_reason is not None:
        logger.warning(
            "contact: spam submission persisted",
            submission_id=submission.id,
            spam_reason=spam_reason,
        )
        return submission

    background_tasks.add_task(
        send_autoresponder,
        submission_id=submission.id,
        payload=payload,
    )
    background_tasks.add_task(
        send_notify,
        submission_id=submission.id,
        payload=payload,
    )
    return submission


def _spam_reason(payload: ContactSubmissionCreate) -> str | None:
    """Return the spam reason, or ``None`` when the payload looks legitimate.

    Checks the honeypot field, the signed form token (signature + expiry +
    min-age) and the bot-content heuristic. Checked by signature only – no
    session needed.
    """
    if payload.honeypot:
        logger.warning("contact: honeypot filled")
        return _SPAM_REASON_HONEYPOT

    if not contact_token_service.verify_token(payload.token):
        logger.warning("contact: invalid form token")
        return _SPAM_REASON_TOKEN

    if _looks_like_bot_content(payload):
        logger.warning(
            "contact: bot content detected",
            name=payload.name,
            message=payload.message,
            email=payload.email,
        )
        return _SPAM_REASON_CONTENT

    return None


def _looks_like_bot_content(payload: ContactSubmissionCreate) -> bool:
    """Return True when the payload looks like machine-generated bot content.

    Deliberately conservative to minimize false positives on real submissions:
    only classifies as bot when **both** ``name`` and ``message`` are pure
    alphanumeric random tokens (no spaces/sentence structure). A dotted local
    email part (e.g. ``w.i.s.ama.la``) never stands alone – it only reinforces
    the verdict when at least one field is already token-like.
    """
    name_is_token = bool(_RANDOM_TOKEN_RE.fullmatch(payload.name.strip()))
    message_is_token = bool(_RANDOM_TOKEN_RE.fullmatch(payload.message.strip()))

    if name_is_token and message_is_token:
        return True

    if name_is_token or message_is_token:
        local_part = str(payload.email).split("@", 1)[0]
        if local_part.count(".") >= _EMAIL_OBFUSCATION_MIN_DOTS:
            return True

    return False


async def list_submissions(db: AsyncSession) -> list[ContactSubmissionAdminOut]:
    """Return all contact submissions, newest first.

    Args:
        db: Active DB session.

    Returns:
        All stored submissions ordered by ``created_at`` descending.
    """
    submissions = await contact_submission_repository.list_all(db)
    logger.info("contact: listed submissions", count=len(submissions))
    return submissions


async def delete_submission(db: AsyncSession, submission_id: int) -> bool:
    """Delete a contact submission by id.

    Args:
        db: Active DB session.
        submission_id: Id of the submission to delete.

    Returns:
        True when the row was deleted; False when no row with the id exists
        (caller maps this to a 404).
    """
    deleted = await contact_submission_repository.delete_by_id(db, submission_id)
    if not deleted:
        logger.info("contact: delete skipped – submission not found", submission_id=submission_id)
        return False

    logger.info("contact: deleted submission", submission_id=submission_id)
    return True
