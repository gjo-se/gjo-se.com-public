"""FastAPI router for the application submission status endpoint (gjo_se_com).

Exposes a single admin-only route under ``/application-submissions``:

- ``PATCH /{submission_id}/status`` – sets a lifecycle status on the submission,
  enforcing the transitions defined in ``status_service``.

The router is pure wiring: unknown submissions map to 404, unknown status names
to 422 and disallowed transitions to 409.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.exceptions import ApplicationStatusTransitionError
from app.application.repositories import submission_repository
from app.application.schemas.submission_schemas import (
    SubmissionDetailOut,
    SubmissionStatusUpdate,
)
from app.application.services import status_service, submission_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.ports.project import ProjectCatalogPort, get_project_catalog_port
from app.shared.security.dependencies.auth_dependencies import AdminUser

logger = logging.getLogger(__name__)

router = APIRouter()


@router.patch(
    "/{submission_id}/status",
    response_model=SubmissionDetailOut,
    summary="Set a submission lifecycle status (admin)",
    responses={
        404: {"description": "Vorgang nicht gefunden"},
        409: {"description": "Übergang nicht erlaubt"},
        422: {"description": "Status unbekannt"},
    },
)
async def update_submission_status(
    _: AdminUser,
    submission_id: int,
    body: SubmissionStatusUpdate,
    db: AsyncSession = Depends(get_gjo_se_db),
    catalog: ProjectCatalogPort = Depends(get_project_catalog_port),
) -> SubmissionDetailOut:
    """Sets a lifecycle status on ``submission_id`` and returns the detail view.

    The service enforces ``ALLOWED_TRANSITIONS``; system-managed targets
    (``sent``/``failed``) are not accepted here. The project marker ``applied``
    is never touched.
    """
    submission = await submission_repository.get_by_id(db, submission_id)
    if submission is None:
        logger.warning("application_status: submission_id=%s not found", submission_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vorgang nicht gefunden",
        )

    try:
        await status_service.set_submission_status(db, submission_id=submission.id, target_name=body.status)
    except ApplicationStatusTransitionError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    await db.commit()

    reloaded = await submission_repository.get_by_id(db, submission_id)
    if reloaded is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vorgang nicht gefunden",
        )
    return await submission_service.serialize_submission_detail(db, reloaded, catalog)
