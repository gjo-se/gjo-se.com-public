"""FastAPI router for the application submission send endpoint (gjo_se_com).

Exposes a single admin-only route under ``/application-submissions``:

- ``POST /{submission_id}/send`` – sends (or retries) the persisted submission
  snapshot via ``send_service``.

The router is pure wiring: the full send logic (status transitions, history,
``applied`` marker, retry) lives in the service. Contact blocks map to 409,
send failures to 502 and unknown submissions to 404.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.exceptions import ApplicationSendError
from app.application.repositories import submission_repository
from app.application.schemas.submission_schemas import (
    SubmissionDetailOut,
)
from app.application.services import send_service, submission_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.ports.crm_contact import ContactBlockedError
from app.shared.ports.project import ProjectCatalogPort, get_project_catalog_port
from app.shared.security.dependencies.auth_dependencies import AdminUser
from app.shared.status.repositories import statusable_repository

logger = logging.getLogger(__name__)

router = APIRouter()

_STATUSABLE_TYPE = "application_submission"
_FAILED_STATUS = "failed"


@router.post(
    "/{submission_id}/send",
    response_model=SubmissionDetailOut,
    summary="Send or retry a submission (admin)",
    responses={
        404: {"description": "Vorgang nicht gefunden"},
        409: {"description": "Person/Firma kontakt-gesperrt"},
        502: {"description": "Versand fehlgeschlagen"},
    },
)
async def send_submission(
    _: AdminUser,
    submission_id: int,
    db: AsyncSession = Depends(get_gjo_se_db),
    catalog: ProjectCatalogPort = Depends(get_project_catalog_port),
) -> SubmissionDetailOut:
    """Sends the persisted submission snapshot or retries a ``failed`` one.

    A submission in status ``failed`` is retried via ``retry_submission``,
    every other submission is sent via ``send_submission``. The persited
    snapshot is reused verbatim (no re-render). Contact blocks map to 409,
    send failures to 502 and unknown submissions to 404.
    """
    submission = await submission_repository.get_by_id(db, submission_id)
    if submission is None:
        logger.warning("application_send: submission_id=%s not found", submission_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vorgang nicht gefunden",
        )

    row = await statusable_repository.get_status(db, _STATUSABLE_TYPE, submission.id)
    current = row.status.name if row is not None else None

    try:
        if current == _FAILED_STATUS:
            await send_service.retry_submission(db, submission, catalog)
        else:
            await send_service.send_submission(db, submission, catalog)
    except ContactBlockedError as exc:
        logger.warning("application_send: submission_id=%s contact-blocked: %s", submission_id, exc)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except ApplicationSendError as exc:
        logger.warning("application_send: submission_id=%s send failed: %s", submission_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    logger.info("application_send: submission_id=%s sent", submission_id)

    # The service commits the status/history (its catalog write commits the
    # unit of work), and ``submission_repository.get_by_id`` re-reads the row and
    # resolves the status through a fresh query – so the reload already reflects
    # the result without expiring the (DTO) instance.
    reloaded = await submission_repository.get_by_id(db, submission_id)
    if reloaded is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vorgang nicht gefunden",
        )
    return await submission_service.serialize_submission_detail(db, reloaded, catalog)
