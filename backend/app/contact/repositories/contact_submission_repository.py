"""Database access for contact form submissions (gjo_se_com).

Read/write operations return ``ContactSubmissionAdminOut`` DTOs (never ORM
models) so the service layer stays free of ``app.contact.models`` imports
(Achse-2: ``services`` > ``repositories``).
"""

from datetime import datetime
from typing import Any, cast

from sqlalchemy import CursorResult, delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contact.models.contact_submission import ContactSubmission
from app.contact.schemas.contact_submission_schemas import ContactSubmissionAdminOut


def _to_out(submission: ContactSubmission) -> ContactSubmissionAdminOut:
    """Maps a contact-submission ORM row to its admin DTO.

    Args:
        submission: The persisted ``ContactSubmission`` row.

    Returns:
        The fully populated admin DTO handed to the service layer.
    """
    return ContactSubmissionAdminOut(
        id=submission.id,
        name=submission.name,
        email=submission.email,
        message=submission.message,
        page=submission.page,
        lang=submission.lang,
        created_at=submission.created_at,
        ip=submission.ip,
        is_spam=submission.is_spam,
        spam_reason=submission.spam_reason,
    )


async def create(
    db: AsyncSession,
    *,
    name: str,
    email: str,
    message: str,
    page: str | None,
    ip: str | None,
    lang: str,
    is_spam: bool,
    spam_reason: str | None,
) -> ContactSubmissionAdminOut:
    """Builds and persists a new submission, returning its DTO.

    Args:
        db: Active async DB session.
        name: Submitter name.
        email: Submitter email.
        message: Free-text message.
        page: Page the request originated from (or ``None``).
        ip: Client IP at request time (or ``None``), internal analysis only.
        lang: Submission language steering the autoresponder template.
        is_spam: Whether the spam heuristic flagged the submission.
        spam_reason: The fired spam reason, or ``None`` for ham.

    Returns:
        The persisted submission as admin DTO.
    """
    submission = ContactSubmission(
        name=name,
        email=email,
        message=message,
        page=page,
        ip=ip,
        lang=lang,
        is_spam=is_spam,
        spam_reason=spam_reason,
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    return _to_out(submission)


async def list_all(db: AsyncSession) -> list[ContactSubmissionAdminOut]:
    """Returns all contact submissions, newest first, as DTOs.

    Args:
        db: Active async DB session.

    Returns:
        All stored submissions ordered by ``created_at`` descending.
    """
    result = await db.execute(select(ContactSubmission).order_by(ContactSubmission.created_at.desc()))
    return [_to_out(submission) for submission in result.scalars().all()]


async def delete_by_id(db: AsyncSession, submission_id: int) -> bool:
    """Deletes a contact submission by id.

    Args:
        db: Active async DB session.
        submission_id: Id of the submission to delete.

    Returns:
        True when the row was deleted; False when no row with the id exists.
    """
    submission = await db.get(ContactSubmission, submission_id)
    if submission is None:
        return False

    await db.delete(submission)
    await db.commit()
    return True


async def purge_spam_before(db: AsyncSession, *, cutoff: datetime) -> int:
    """Deletes flagged spam submissions older than *cutoff* (PII retention).

    Only rows with ``is_spam=True`` are removed – legitimate submissions are
    kept. Runs as a scheduled maintenance job.

    Args:
        db: Active async DB session.
        cutoff: Spam rows created before this instant are purged.

    Returns:
        Number of deleted rows.
    """
    result = await db.execute(
        delete(ContactSubmission).where(
            ContactSubmission.is_spam.is_(True),
            ContactSubmission.created_at < cutoff,
        )
    )
    await db.commit()
    return cast(CursorResult[Any], result).rowcount or 0
