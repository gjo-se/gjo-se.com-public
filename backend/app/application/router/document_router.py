"""FastAPI router for admin application document endpoints (gjo_se_com).

Exposes admin-only CV routes under ``/application-submissions``:

- ``POST /{submission_id}/cv-skills`` – batch-adds curated skills via the FBF
  pipeline and re-renders the submission's CV exactly once.
- ``POST /{submission_id}/cv-skills/exclude`` – excludes a single skill and
  re-renders the CV once.
- ``POST /{submission_id}/cv-regenerate`` – re-renders the submission's CV
  without changing any skills (manual refresh after curation).

The document download lives in ``document_download_router``.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.repositories import submission_repository
from app.application.schemas.document_schemas import (
    CvRegenerateRequest,
    CvSkillAddRequest,
    CvSkillExcludeRequest,
    DocumentOut,
)
from app.application.services import (
    cv_service,
    cv_skill_service,
)
from app.shared.db_access.session import AsyncSessionLocal as CoreAsyncSessionLocal
from app.shared.db_access.session import get_gjo_se_db
from app.shared.embedding.dependencies.embedding_dependencies import get_embedding_client
from app.shared.embedding.infrastructure.embedding_client import EmbeddingClient
from app.shared.ports.project import ProjectCatalogPort, get_project_catalog_port
from app.shared.ports.skill import SkillCatalogPort, get_skill_catalog_port
from app.shared.security.dependencies.auth_dependencies import AdminUser

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/{submission_id}/cv-skills",
    response_model=DocumentOut,
    status_code=status.HTTP_200_OK,
    summary="Add curated CV skills and regenerate the CV once (admin)",
    responses={
        200: {"description": "Skills added; the fresh CV document is returned"},
        404: {"description": "Submission not found"},
        422: {"description": "Invalid request body"},
    },
)
async def add_submission_cv_skills(
    _: AdminUser,
    submission_id: int,
    payload: CvSkillAddRequest,
    db: AsyncSession = Depends(get_gjo_se_db),
    embedding_client: EmbeddingClient = Depends(get_embedding_client),
    catalog: ProjectCatalogPort = Depends(get_project_catalog_port),
    skills: SkillCatalogPort = Depends(get_skill_catalog_port),
) -> DocumentOut:
    """Adds missing skills to a submission's CV and re-renders it once.

    Resolves the submission, then delegates to
    :func:`cv_skill_service.add_cv_skills`, which ensures each skill
    via the FBF pipeline, links it curated and replaces the previous CV snapshot
    with a single fresh render.

    Raises:
        HTTPException: 404 if the submission is unknown.
    """
    submission = await submission_repository.get_by_id(db, submission_id)
    if submission is None:
        logger.warning("application_document: submission_id=%s not found", submission_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vorgang nicht gefunden",
        )

    async with CoreAsyncSessionLocal() as core_db:
        document = await cv_skill_service.add_cv_skills(
            db,
            submission=submission,
            items=payload.items,
            core_db=core_db,
            embedding_client=embedding_client,
            catalog=catalog,
            skills=skills,
        )
    return DocumentOut.model_validate(document)


@router.post(
    "/{submission_id}/cv-skills/exclude",
    response_model=DocumentOut,
    status_code=status.HTTP_200_OK,
    summary="Exclude a skill from the CV and regenerate the CV once (admin)",
    responses={
        200: {"description": "Skill excluded; the fresh CV document is returned"},
        404: {"description": "Submission or skill not found"},
    },
)
async def exclude_submission_cv_skill(
    _: AdminUser,
    submission_id: int,
    payload: CvSkillExcludeRequest,
    db: AsyncSession = Depends(get_gjo_se_db),
    catalog: ProjectCatalogPort = Depends(get_project_catalog_port),
    skills: SkillCatalogPort = Depends(get_skill_catalog_port),
) -> DocumentOut:
    """Excludes a single skill from the CV and re-renders it once.

    Resolves the submission, then delegates to
    :func:`cv_skill_service.exclude_cv_skill`, which detaches the
    skill from its master, flags it ``rejected`` and replaces the previous CV
    snapshot with a single fresh render.

    Raises:
        HTTPException: 404 if the submission or the skill is unknown.
    """
    submission = await submission_repository.get_by_id(db, submission_id)
    if submission is None:
        logger.warning("application_document: submission_id=%s not found", submission_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vorgang nicht gefunden",
        )

    try:
        document = await cv_skill_service.exclude_cv_skill(
            db, submission=submission, name=payload.name, catalog=catalog, skills=skills
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return DocumentOut.model_validate(document)


@router.post(
    "/{submission_id}/cv-regenerate",
    response_model=DocumentOut,
    status_code=status.HTTP_200_OK,
    summary="Re-render the submission's CV once without changing skills (admin)",
    responses={
        200: {"description": "CV re-rendered; the fresh document is returned"},
        404: {"description": "Submission not found"},
    },
)
async def regenerate_submission_cv(
    _: AdminUser,
    submission_id: int,
    payload: CvRegenerateRequest | None = None,
    db: AsyncSession = Depends(get_gjo_se_db),
    catalog: ProjectCatalogPort = Depends(get_project_catalog_port),
    skills: SkillCatalogPort = Depends(get_skill_catalog_port),
) -> DocumentOut:
    """Re-renders a submission's CV and replaces the previous snapshot.

    Manual refresh after curation changes (e.g. a skill was re-linked to another
    master in the dedup board) – no skills are added or removed. The previous CV
    snapshot is deleted (object + row) and replaced by a single fresh render.

    An optional body switches the grouped skill section to the curated default
    skills (``use_default_skills=True``) for projects whose posting demands too
    few skills. Without a body the previously chosen mode is inherited.

    Raises:
        HTTPException: 404 if the submission is unknown.
    """
    submission = await submission_repository.get_by_id(db, submission_id)
    if submission is None:
        logger.warning("application_document: submission_id=%s not found", submission_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vorgang nicht gefunden",
        )

    use_default_skills = payload.use_default_skills if payload is not None else None
    document = await cv_service.regenerate_cv_document(
        db, submission=submission, catalog=catalog, skills=skills, use_default_skills=use_default_skills
    )
    await db.commit()
    return DocumentOut.model_validate(document)
