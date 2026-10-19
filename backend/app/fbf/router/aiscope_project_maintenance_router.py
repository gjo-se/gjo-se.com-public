"""Aiscope admin endpoints: skill maintenance and dedup housekeeping."""

import os
from typing import Any, cast

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import CursorResult, func, select, update
from sqlalchemy import delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.dependencies.fbf_dependencies import (
    get_skill_extraction_service,
)
from app.fbf.models.project import Project
from app.fbf.models.project_freelancer_map import ProjectFreelancerMap
from app.fbf.repositories import project_repository
from app.fbf.schemas.aiscope_router_schemas import (
    BackfillSkillErrorOut,
    BackfillSkillsResponse,
)
from app.fbf.schemas.dedup_schemas import (
    BatchDedupResponse,
    DedupHealthResponse,
)
from app.fbf.services.skill_extraction_service import SkillExtractionService
from app.shared.db_access.session import get_db, get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

logger = structlog.get_logger(__name__)

router = APIRouter()


@router.get(
    "/dedup/health",
    response_model=DedupHealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Dedup Health Check – Postgres-Vektor-Status & Konfiguration (Admin)",
)
async def dedup_health(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> DedupHealthResponse:
    """Returns Postgres vector state and dedup configuration for monitoring.

    Reads ``DEDUP_THRESHOLD``, ``DEDUP_TOP_K``, ``EMBEDDING_MODEL``
    from environment variables and the count of ``project.vector`` rows
    (``vector IS NOT NULL``) from the gjo_se_com database.
    """
    try:
        count_result = await db.execute(select(func.count(Project.id)).where(Project.vector.isnot(None)))
        table_size: int = count_result.scalar_one()
    except Exception:
        logger.exception("dedup_health: Postgres vector count unavailable – reporting table_size=0")
        table_size = 0

    threshold = float(os.environ.get("DEDUP_THRESHOLD", "0.80"))
    top_k = int(os.environ.get("DEDUP_TOP_K", "5"))
    model = os.environ.get("EMBEDDING_MODEL", "openai/text-embedding-3-small")

    return DedupHealthResponse(
        table_size=table_size,
        threshold=threshold,
        model=model,
        top_k=top_k,
    )


@router.post(
    "/projects/backfill-skills",
    response_model=BackfillSkillsResponse,
    status_code=status.HTTP_200_OK,
    summary="Text-Backfill: Alle Master-Projekte nach uebersehenen Skills scannen (Admin)",
)
async def backfill_skills_all(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    skill_extraction_service: SkillExtractionService = Depends(get_skill_extraction_service),
) -> BackfillSkillsResponse:
    """Scans every master project with ``merged_description_de`` against ALL
    DB skills via Aho-Corasick and links any literal matches that the LLM
    missed.

    Does NOT create new ``Skill`` rows — only links existing skills.
    Individual project failures are collected and reported, never aborting
    the full run.
    """
    master_ids = await project_repository.get_all_ids(db)
    total_scanned = 0
    total_linked = 0
    error_entries: list[BackfillSkillErrorOut] = []

    svc = skill_extraction_service
    for idx, pid in enumerate(master_ids, start=1):
        try:
            linked = await svc.backfill_text_matches(db, pid)
            total_scanned += 1
            total_linked += linked
        except Exception:
            logger.exception("backfill_skills_all: project_id=%d failed", pid)
            error_entries.append(BackfillSkillErrorOut(project_id=pid, error="exception"))
        if idx % 100 == 0:
            logger.info("backfill_skills_all: progress %d/%d", idx, len(master_ids))

    logger.info(
        "backfill_skills_all: complete – scanned=%d linked=%d errors=%d",
        total_scanned,
        total_linked,
        len(error_entries),
    )
    return BackfillSkillsResponse(
        scanned=total_scanned,
        linked=total_linked,
        errors=error_entries,
    )


@router.post(
    "/projects/{project_id}/classify-skills",
    status_code=status.HTTP_200_OK,
    summary="Skills + JobRole fuer ein einzelnes Projekt extrahieren (Admin)",
)
async def classify_project_skills(
    project_id: int,
    _: AdminUser,
    gjo_db: AsyncSession = Depends(get_gjo_se_db),
    core_db: AsyncSession = Depends(get_db),
    skill_extraction_service: SkillExtractionService = Depends(get_skill_extraction_service),
) -> dict[str, Any]:
    """Extrahiert Skills und JobRole fuer genau ein Master-Projekt.

    Exponiert ``SkillExtractionService.extract_for_master`` fuer die
    Einzelprojekt-Pipeline. Neue Skills werden als ``pending`` persistiert und
    mit dem Projekt verknuepft; die JobRole wird – falls erkannt – gesetzt.

    **Voraussetzung:** das Projekt braucht eine konsolidierte Beschreibung
    (``merged_description_de``). Vorher ``POST /projects/{project_id}/merge-description``
    aufrufen. Ohne diese bleibt die Extraktion leer.

    Vollstaendige Pipeline-Reihenfolge:
    ``merge-description`` → ``classify-skills`` → ``embed-vector`` →
    ``recalculate-score``.

    Args:
        project_id: Primary key des Master-Projekts.
        _: Admin user (via dependency).
        gjo_db: gjo_se_com database connection (Project + Skill).
        core_db: core database connection (LLM infrastructure).

    Returns:
        dict mit ``status``, ``project_id`` und Anzahl extrahierter ``skills``.

    Raises:
        HTTPException 404: Project not found.
    """
    existing = await project_repository.get_by_id(gjo_db, project_id)
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        )

    svc = skill_extraction_service
    skills = await svc.extract_for_master(gjo_db, core_db, project_id, trigger="manual")
    return {"status": "completed", "project_id": project_id, "skills": len(skills)}


@router.post(
    "/batch-dedup/run",
    response_model=BatchDedupResponse,
    status_code=status.HTTP_200_OK,
    summary="Batch-Dedup ueber alle historischen PM-Eintraege starten (Admin)",
)
async def run_batch_dedup(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> BatchDedupResponse:
    """Resets all PM entries and deletes all projects.

    1. Deletes ALL normalised projects (and their junction rows).
    2. Resets ``mapped_at`` on all ``project_freelancer_map`` entries,
       ``canonical_id`` on all ``project`` entries.

    Deleting every ``Project`` empties ``project.vector`` automatically, so no
    separate embedding reset is required.

    **WARNING:** All manual adjustments to projects are lost.

    Use "Jetzt scrapen + normalisieren" afterwards to rebuild projects.
    """
    try:
        # 1. Reset all slave projects to master (canonical_id = NULL)
        await db.execute(update(Project).values(canonical_id=None))
        # Reset all PM entries (mapped_at = NULL)
        result = await db.execute(update(ProjectFreelancerMap).values(mapped_at=None))
        await db.commit()
        pm_reset: int = cast(CursorResult[object], result).rowcount
        logger.info("Komplett-Reset: %d PM entries reset", pm_reset)

        # 2. Delete ALL normalised projects
        delete_result = await db.execute(sa_delete(Project))
        await db.commit()
        projects_deleted: int = cast(CursorResult[object], delete_result).rowcount
        logger.info("Komplett-Reset: %d projects deleted", projects_deleted)

        return BatchDedupResponse(
            status="completed",
            total_processed=0,
            new_projects=0,
            duplicates_found=0,
            errors=0,
            projects_deleted=projects_deleted,
            stats=None,
        )
    except Exception:
        logger.exception("Komplett-Reset failed")
        return BatchDedupResponse(
            status="error",
            total_processed=0,
            new_projects=0,
            duplicates_found=0,
            errors=1,
            projects_deleted=0,
        )
