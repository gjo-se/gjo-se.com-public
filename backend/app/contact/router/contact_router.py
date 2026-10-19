"""FastAPI routers for contact form submissions (gjo_se_com).

Public endpoints (no JWT): ``GET /token`` issues a short-lived signed token and
``POST ""`` accepts a contact submission, applies spam protection (shared
slowapi limiter, honeypot, signed token), persists it (persist-first, DB = SSOT)
and schedules best-effort emails via the notification facade. Always answers
201 – also for silently dropped spam.

Admin endpoints (``/admin/contact``, admin JWT): list and delete raw inbound
submissions. Read/delete only – submissions are never edited, so no
PATCH/PUT endpoint exists. Serves as the admin inbox and as a fallback when
SMTP/Notify fails.
"""

from datetime import UTC, datetime

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.contact.schemas.contact_submission_schemas import (
    ContactSubmissionAdminOut,
    ContactSubmissionCreate,
    ContactSubmissionOut,
    ContactTokenOut,
)
from app.contact.services import (
    contact_submission_service,
    contact_token_service,
)
from app.shared.config.rate_limiting import limiter
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()
admin_router = APIRouter()
logger = structlog.get_logger(__name__)

#: Shared per-IP rate limit for the public contact endpoint.
_CONTACT_RATE_LIMIT = "5/hour"

#: Per-IP rate limit for issuing public contact-form tokens.
_CONTACT_TOKEN_RATE_LIMIT = "20/hour"


@router.get(
    "/token",
    response_model=ContactTokenOut,
    summary="Issue a contact form token (public)",
)
@limiter.limit(_CONTACT_TOKEN_RATE_LIMIT)
async def issue_contact_token(request: Request, response: Response) -> ContactTokenOut:
    """Issue a short-lived, signed token that proves the SPA loaded the form.

    Args:
        request: FastAPI Request (required for rate limiting).
        response: FastAPI Response (to set ``Cache-Control: no-store``).

    Returns:
        ``ContactTokenOut`` with the signed token and its expiry.
    """
    token, expires_at = contact_token_service.issue_token()
    response.headers["Cache-Control"] = "no-store"
    return ContactTokenOut(token=token, expires_at=expires_at)


@router.post(
    "",
    response_model=ContactSubmissionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a contact form (public)",
)
@limiter.limit(_CONTACT_RATE_LIMIT)
async def create_contact_submission(
    request: Request,
    body: ContactSubmissionCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ContactSubmissionOut:
    """Validate, protect from spam, persist and notify for a contact submission.

    Args:
        request: FastAPI Request (required for rate limiting).
        body: Validated contact submission payload.
        background_tasks: FastAPI background tasks for best-effort email sends.
        db: Database connection (gjo_se_com).

    Returns:
        ``ContactSubmissionOut`` for the persisted submission. When the payload
        is classified as spam, a neutral 201 is returned (empty model instance)
        so bots receive no signal – the row is persisted flagged (admin-only).
    """
    client_ip = request.client.host if request.client else None
    submission = await contact_submission_service.create_submission(db, body, background_tasks, client_ip=client_ip)
    if submission.is_spam:
        # Spam silently acknowledged – neutral 201 without exposing the row.
        return ContactSubmissionOut(
            id=0,
            name=body.name,
            email=body.email,
            message=body.message,
            page=body.page,
            lang=body.lang,
            created_at=datetime.now(UTC),
        )
    return ContactSubmissionOut.model_validate(submission)


@admin_router.get(
    "",
    response_model=list[ContactSubmissionAdminOut],
    summary="[Admin] List all contact submissions",
)
async def list_submissions(
    _admin: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[ContactSubmissionAdminOut]:
    """Return all contact submissions, newest first (incl. client IP)."""
    submissions = await contact_submission_service.list_submissions(db)
    return [ContactSubmissionAdminOut.model_validate(s) for s in submissions]


@admin_router.delete(
    "/{submission_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="[Admin] Delete a contact submission",
)
async def delete_submission(
    submission_id: int,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> None:
    """Delete a contact submission by id.

    Raises:
        HTTPException 404: No submission with the given id exists.
    """
    deleted = await contact_submission_service.delete_submission(db, submission_id)
    if not deleted:
        logger.warning("contact admin: delete failed – submission not found", submission_id=submission_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )
