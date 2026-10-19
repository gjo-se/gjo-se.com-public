"""FastAPI router for admin application submission endpoints (gjo_se_com).

Exposes the admin-only routes under ``/application-submissions``:

- ``POST /prepare`` – prepares and persists a ``draft`` submission for a project.
- ``GET /{submission_id}`` – reads a submission detail by its id.
- ``DELETE /{submission_id}`` – deletes a submission incl. its artifacts.
- ``PATCH /{submission_id}/current`` – marks a submission as the project's current one.
- ``GET /by-project/{project_id}`` – reads the current submission detail of a project.
- ``GET /by-project/{project_id}/applications`` – lists all submissions of a project.
- ``GET`` / ``/count`` – paginated list and filtered count.

All responses are serialized via the shared
``submission_service.serialize_submission_detail`` and carry the
status (``core_statusable``), the documents and the communication history.

The mail snapshot (subject + body/HTML) is read-only: it is generated at
``prepare`` from the project (role: ``project.title_normalized``) and the
application profile data, then sent verbatim. The role is curated on the
project, so subject and body always agree.
"""

import datetime
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.exceptions import ApplicationDeleteError, ApplicationPrepareError
from app.application.repositories import submission_repository
from app.application.schemas.submission_schemas import (
    PrepareRequest,
    SubmissionDetailOut,
    SubmissionListOut,
)
from app.application.services import submission_service
from app.application.services.submission_service import SubmissionFilter
from app.shared.db_access.session import get_gjo_se_db
from app.shared.ports.project import ProjectCatalogPort, get_project_catalog_port
from app.shared.ports.skill import SkillCatalogPort, get_skill_catalog_port
from app.shared.security.dependencies.auth_dependencies import AdminUser

logger = logging.getLogger(__name__)

router = APIRouter()


def submission_filter(
    q: str | None = Query(default=None, description="Search term (numeric = exact project id)"),
    status: str | None = Query(default=None, description="Filter by exact status name"),
    crm_person_id: int | None = Query(default=None, description="Filter by linked CRM person id"),
    project_id: int | None = Query(default=None, description="Filter by exact project id"),
    from_date: datetime.date | None = Query(
        default=None,
        alias="from",
        description="Lower date bound for created_at (YYYY-MM-DD, inclusive)",
    ),
    to_date: datetime.date | None = Query(
        default=None,
        alias="to",
        description="Upper date bound for created_at (YYYY-MM-DD, inclusive)",
    ),
) -> SubmissionFilter:
    """Builds the shared submission filter from the query parameters.

    Shared by the list and count endpoints so the six filter query parameters
    (``q``, ``status``, ``crm_person_id``, ``project_id``, ``from``, ``to``) are
    declared exactly once.
    """
    return SubmissionFilter(
        q=q,
        status=status,
        crm_person_id=crm_person_id,
        project_id=project_id,
        from_date=from_date,
        to_date=to_date,
    )


@router.post(
    "/prepare",
    response_model=SubmissionDetailOut,
    status_code=status.HTTP_201_CREATED,
    summary="Prepare a draft application submission for a project (admin)",
)
async def prepare_submission(
    _: AdminUser,
    body: PrepareRequest,
    db: AsyncSession = Depends(get_gjo_se_db),
    catalog: ProjectCatalogPort = Depends(get_project_catalog_port),
    skills: SkillCatalogPort = Depends(get_skill_catalog_port),
) -> SubmissionDetailOut:
    """Prepares a ``draft`` submission for ``project_id`` and returns its detail.

    Always creates another submission: a project may hold several (history);
    the previously current one is demoted and the new one becomes current.

    Maps the domain ``ApplicationPrepareError`` to its HTTP status (404 for an
    unknown project, 422 for an incomplete profile/contact, 500 for a missing
    status seed). No 409 for an already existing submission.
    """
    try:
        submission = await submission_service.prepare_submission(
            db, project_id=body.project_id, catalog=catalog, skills=skills, language=body.language
        )
    except ApplicationPrepareError as exc:
        logger.warning(
            "application_submission: prepare failed (project_id=%s): %s",
            body.project_id,
            exc,
        )
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    return await submission_service.serialize_submission_detail(db, submission, catalog)


@router.get(
    "/by-project/{project_id}",
    response_model=SubmissionDetailOut,
    summary="Read the submission of a project (admin)",
)
async def get_submission_by_project(
    _: AdminUser,
    project_id: int,
    db: AsyncSession = Depends(get_gjo_se_db),
    catalog: ProjectCatalogPort = Depends(get_project_catalog_port),
) -> SubmissionDetailOut:
    """Returns the *current* submission detail of ``project_id`` or 404 if none exists."""
    submission = await submission_repository.get_current_by_project(db, project_id)
    if submission is None:
        logger.warning("application_submission: no current submission for project_id=%s", project_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projekt hat keinen Vorgang",
        )

    return await submission_service.serialize_submission_detail(db, submission, catalog)


@router.get(
    "/by-project/{project_id}/applications",
    response_model=list[SubmissionListOut],
    summary="List all submissions of a project (history, admin)",
)
async def list_project_applications(
    _: AdminUser,
    project_id: int,
    db: AsyncSession = Depends(get_gjo_se_db),
    catalog: ProjectCatalogPort = Depends(get_project_catalog_port),
) -> list[SubmissionListOut]:
    """Returns all submissions of ``project_id`` (newest first, with ``isCurrent``)."""
    return await submission_service.list_project_applications(db, catalog=catalog, project_id=project_id)


@router.get(
    "",
    response_model=list[SubmissionListOut],
    summary="List paginated application submissions (admin)",
)
async def list_submissions(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    catalog: ProjectCatalogPort = Depends(get_project_catalog_port),
    filters: SubmissionFilter = Depends(submission_filter),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(
        default="created_at",
        description=(
            "Sort field: id, subject, recipient_display_name, recipient_company_name, "
            "created_at, updated_at, project_title, last_score"
        ),
    ),
    sort_order: str = Query(
        default="desc",
        pattern="^(asc|desc)$",
        description="Sort direction",
    ),
) -> list[SubmissionListOut]:
    """Returns paginated submissions (newest first by default) with status."""
    return await submission_service.list_submissions(
        db,
        catalog=catalog,
        filters=filters,
        offset=offset,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/count",
    summary="Count application submissions (admin)",
)
async def count_submissions(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    catalog: ProjectCatalogPort = Depends(get_project_catalog_port),
    filters: SubmissionFilter = Depends(submission_filter),
) -> int:
    """Returns the filtered total count of submissions."""
    return await submission_service.count_submissions(db, catalog=catalog, filters=filters)


@router.get(
    "/{submission_id}",
    response_model=SubmissionDetailOut,
    summary="Read a submission detail by id (admin)",
)
async def get_submission(
    _: AdminUser,
    submission_id: int,
    db: AsyncSession = Depends(get_gjo_se_db),
    catalog: ProjectCatalogPort = Depends(get_project_catalog_port),
) -> SubmissionDetailOut:
    """Returns the submission detail for ``submission_id`` or 404 if unknown."""
    submission = await submission_repository.get_by_id(db, submission_id)
    if submission is None:
        logger.warning("application_submission: submission_id=%s not found", submission_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vorgang nicht gefunden",
        )

    return await submission_service.serialize_submission_detail(db, submission, catalog)


@router.delete(
    "/{submission_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a submission (admin)",
    responses={404: {"description": "Vorgang nicht gefunden"}},
)
async def delete_submission(
    _: AdminUser,
    submission_id: int,
    db: AsyncSession = Depends(get_gjo_se_db),
    catalog: ProjectCatalogPort = Depends(get_project_catalog_port),
) -> None:
    """Deletes a submission incl. document blobs, communications and status link.

    Maps the domain ``ApplicationDeleteError`` to its HTTP status (404 for an
    unknown submission).
    """
    try:
        await submission_service.delete_submission(db, submission_id=submission_id, catalog=catalog)
    except ApplicationDeleteError as exc:
        logger.warning(
            "application_submission: delete failed (submission_id=%s): %s",
            submission_id,
            exc,
        )
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.patch(
    "/{submission_id}/current",
    response_model=SubmissionDetailOut,
    summary="Mark a submission as the current one (admin)",
    responses={404: {"description": "Vorgang nicht gefunden"}},
)
async def set_current_submission(
    _: AdminUser,
    submission_id: int,
    db: AsyncSession = Depends(get_gjo_se_db),
    catalog: ProjectCatalogPort = Depends(get_project_catalog_port),
) -> SubmissionDetailOut:
    """Marks ``submission_id`` as its project's current submission.

    Demotes the project's other submissions. Maps the domain
    ``ApplicationDeleteError`` to its HTTP status (404 for an unknown
    submission).
    """
    try:
        submission = await submission_service.set_current_submission(db, submission_id=submission_id)
    except ApplicationDeleteError as exc:
        logger.warning(
            "application_submission: set current failed (submission_id=%s): %s",
            submission_id,
            exc,
        )
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    return await submission_service.serialize_submission_detail(db, submission, catalog)
