"""Database access for single application submissions (gjo_se_com).

Single-record reads (by id / by project), write helpers and the current-flag
management live here. Reads return ``SubmissionDetailOut`` DTOs (never ORM
models) so the service layer stays free of ``app.<ctx>.models`` imports. The
paginated list/count queries and their filter family live in
``submission_list_repository``.
"""

from typing import Any

from sqlalchemy import select
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.application.infrastructure import application_mail_client
from app.application.models.submission import Submission
from app.application.repositories.submission_status_repository import (
    move_current,
    set_current,
)
from app.application.schemas.submission_schemas import SubmissionDetailOut

# Frozen-test compatibility re-exports (historical import path). The real
# implementation lives in ``submission_status_repository`` after the LCOM4 split.
__all__ = [
    "create_prepared",
    "delete_by_id",
    "demote_current",
    "get_by_id",
    "get_by_project",
    "get_current_by_project",
    "move_current",
    "set_current",
]


def _to_detail(submission: Submission) -> SubmissionDetailOut:
    """Maps a submission ORM row (with loaded children) to its detail DTO."""
    return SubmissionDetailOut.model_validate(submission)


async def get_by_id(db: AsyncSession, submission_id: int) -> SubmissionDetailOut | None:
    """Returns a single submission by id as DTO or None.

    Eager-loads ``documents`` and ``communications`` so the caller can serialize
    the attached documents and the communication history without extra queries.
    """
    result = await db.execute(
        select(Submission)
        .options(
            selectinload(Submission.documents),
            selectinload(Submission.communications),
        )
        .where(Submission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    return _to_detail(submission) if submission is not None else None


async def get_current_by_project(db: AsyncSession, project_id: int) -> SubmissionDetailOut | None:
    """Returns the *current* submission of a project as DTO or None.

    A project may carry several submissions (history, e.g. de/en); exactly one
    of them is flagged ``is_current``. The partial unique index on
    ``(project_id) WHERE is_current`` guarantees at most one current row, so
    ``scalar_one_or_none`` stays safe.
    """
    result = await db.execute(
        select(Submission)
        .options(
            selectinload(Submission.documents),
            selectinload(Submission.communications),
        )
        .where(
            Submission.project_id == project_id,
            Submission.is_current.is_(True),
        )
    )
    submission = result.scalar_one_or_none()
    return _to_detail(submission) if submission is not None else None


async def get_by_project(db: AsyncSession, project_id: int) -> SubmissionDetailOut | None:
    """Backward-compatible alias of :func:`get_current_by_project`."""
    return await get_current_by_project(db, project_id)


async def create_prepared(
    db: AsyncSession,
    *,
    project_id: int,
    sender_profile_id: int,
    subject: str,
    body: str,
    language: str,
    sender_email: str,
    reply_to_email: str | None,
    recipient_email: str,
    recipient_display_name: str | None,
    recipient_company_name: str | None,
    rendered: Any,
) -> SubmissionDetailOut:
    """Builds and persists a new current submission, returning its detail DTO.

    The mail snapshot is applied via ``store_mail_on_submission`` before the
    first flush (the NOT NULL snapshot columns must be complete on INSERT).
    """
    submission = Submission(
        project_id=project_id,
        is_current=True,
        sender_profile_id=sender_profile_id,
        subject=subject,
        body=body,
        language=language,
        sender_email=sender_email,
        reply_to_email=reply_to_email,
        recipient_email=recipient_email,
        recipient_display_name=recipient_display_name,
        recipient_company_name=recipient_company_name,
    )
    application_mail_client.store_mail_on_submission(submission, rendered)
    db.add(submission)
    await db.flush()
    created = await get_by_id(db, submission.id)
    if created is None:
        raise RuntimeError("submission vanished after create")
    return created


async def delete_by_id(db: AsyncSession, submission_id: int) -> None:
    """Deletes a submission by id; documents and communications cascade via ORM.

    The caller is responsible for committing and for removing any object-store
    blobs referenced by the submission's documents (no DB-level blob cleanup).
    """
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = result.scalar_one_or_none()
    if submission is not None:
        await db.delete(submission)
        await db.flush()


async def demote_current(db: AsyncSession, project_id: int) -> None:
    """Flags every current submission of a project as no longer current.

    Used before inserting a new submission so the partial unique index on
    ``(project_id) WHERE is_current`` never sees two current rows. Issues a
    bulk ``UPDATE``; the caller owns the transaction and must commit.

    Args:
        db: Active async DB session.
        project_id: The project whose current submission(s) are demoted.
    """
    await db.execute(sa_update(Submission).where(Submission.project_id == project_id).values(is_current=False))
