"""FastAPI router for admin application score endpoints (gjo_se_com).

Exposes the admin-only routes under ``/application-score``:

- ``POST ""`` – runs a score run for a project/submission (201).
- ``GET /by-submission/{submission_id}/latest`` – latest run of a submission.
- ``GET /by-submission/{submission_id}`` – append-only score history (newest first).
- ``GET /by-project/{project_id}/latest`` – latest run of a project's submission.
- ``GET /{run_id}`` – single run detail.

All responses are serialized via
``score_service.serialize_score_run`` (total score, verdict,
criteria, per-group aggregates, coverage and requirements).

The ``POST`` endpoint persists in the ``gjo_se_com`` database; the content
scoring opens its own core sessions internally (the LLM infrastructure lives in
the core database). Domain errors (``ApplicationScoreError``) are mapped onto
their HTTP status (404 unknown, 422 missing description, 502 LLM failure).
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.exceptions import ApplicationScoreError
from app.application.repositories import (
    score_run_repository,
    submission_repository,
)
from app.application.schemas.score_schemas import (
    ScoreRunOut,
    ScoreStartRequest,
)
from app.application.services import score_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.ports.project import ProjectCatalogPort, get_project_catalog_port
from app.shared.ports.skill import SkillCatalogPort, get_skill_catalog_port
from app.shared.security.dependencies.auth_dependencies import AdminUser

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "",
    response_model=ScoreRunOut,
    status_code=status.HTTP_201_CREATED,
    summary="Bewerbungs-Score für Projekt/Vorgang ausführen (admin)",
)
async def start_score_run(
    _: AdminUser,
    body: ScoreStartRequest,
    gjo_db: AsyncSession = Depends(get_gjo_se_db),
    catalog: ProjectCatalogPort = Depends(get_project_catalog_port),
    skills: SkillCatalogPort = Depends(get_skill_catalog_port),
) -> ScoreRunOut:
    """Runs a complete score run and returns its detail.

    Maps the domain ``ApplicationScoreError`` to its HTTP status (404 for an
    unknown submission/project, 422 for a missing description/profile, 502 for
    a failed LLM call).
    """
    try:
        run = await score_service.run_application_score(
            gjo_db,
            catalog=catalog,
            skills=skills,
            project_id=body.project_id,
            submission_id=body.submission_id,
            description_override=body.description_override,
        )
    except ApplicationScoreError as exc:
        logger.warning(
            "application_score: run failed (project_id=%s, submission_id=%s): %s",
            body.project_id,
            body.submission_id,
            exc,
        )
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    return await score_service.serialize_score_run(gjo_db, run, skills)


@router.get(
    "/by-submission/{submission_id}/latest",
    response_model=ScoreRunOut,
    summary="Letzten Score-Run eines Vorgangs lesen (admin)",
)
async def get_latest_score_run_by_submission(
    _: AdminUser,
    submission_id: int,
    gjo_db: AsyncSession = Depends(get_gjo_se_db),
    skills: SkillCatalogPort = Depends(get_skill_catalog_port),
) -> ScoreRunOut:
    """Returns the latest score run of ``submission_id`` or 404 if none exists."""
    run = await score_run_repository.get_latest_by_submission(gjo_db, submission_id)
    if run is None:
        logger.warning("application_score: no run for submission_id=%s", submission_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kein Score-Run für diesen Vorgang",
        )

    return await score_service.serialize_score_run(gjo_db, run, skills)


@router.get(
    "/by-submission/{submission_id}",
    response_model=list[ScoreRunOut],
    summary="Score-Historie eines Vorgangs lesen (admin)",
)
async def list_score_runs_by_submission(
    _: AdminUser,
    submission_id: int,
    gjo_db: AsyncSession = Depends(get_gjo_se_db),
    skills: SkillCatalogPort = Depends(get_skill_catalog_port),
) -> list[ScoreRunOut]:
    """Returns the append-only score history of ``submission_id`` (newest first).

    An empty list is valid and returns 200 (no 404).
    """
    runs = await score_run_repository.list_history_by_submission(gjo_db, submission_id)
    return [await score_service.serialize_score_run(gjo_db, run, skills) for run in runs]


@router.get(
    "/by-project/{project_id}/latest",
    response_model=ScoreRunOut,
    summary="Letzten Score-Run eines Projekts lesen (admin)",
)
async def get_latest_score_run_by_project(
    _: AdminUser,
    project_id: int,
    gjo_db: AsyncSession = Depends(get_gjo_se_db),
    skills: SkillCatalogPort = Depends(get_skill_catalog_port),
) -> ScoreRunOut:
    """Returns the latest score run of the submission of ``project_id``.

    Raises 404 if the project has no submission or that submission has no run.
    """
    submission = await submission_repository.get_by_project(gjo_db, project_id)
    if submission is None:
        logger.warning("application_score: no submission for project_id=%s", project_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projekt hat keinen Vorgang",
        )

    run = await score_run_repository.get_latest_by_submission(gjo_db, submission.id)
    if run is None:
        logger.warning(
            "application_score: no run for project_id=%s (submission_id=%s)",
            project_id,
            submission.id,
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kein Score-Run für dieses Projekt",
        )

    return await score_service.serialize_score_run(gjo_db, run, skills)


@router.get(
    "/{run_id}",
    response_model=ScoreRunOut,
    summary="Score-Run-Detail per id lesen (admin)",
)
async def get_score_run(
    _: AdminUser,
    run_id: int,
    gjo_db: AsyncSession = Depends(get_gjo_se_db),
    skills: SkillCatalogPort = Depends(get_skill_catalog_port),
) -> ScoreRunOut:
    """Returns the score run detail for ``run_id`` or 404 if unknown."""
    run = await score_run_repository.get_by_id(gjo_db, run_id)
    if run is None:
        logger.warning("application_score: run_id=%s not found", run_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Score-Run nicht gefunden",
        )

    return await score_service.serialize_score_run(gjo_db, run, skills)
