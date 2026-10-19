"""Aiscope admin endpoints: project embedding (single + backfill)."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.dependencies.fbf_dependencies import get_embedding_service
from app.fbf.services.embedding_service import EmbeddingService
from app.shared.db_access.session import get_gjo_se_db
from app.shared.embedding.dependencies.embedding_dependencies import get_embedding_client
from app.shared.embedding.infrastructure.embedding_client import EmbeddingClient
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


@router.post(
    "/projects/{project_id}/embed-vector",
    status_code=status.HTTP_200_OK,
    summary="Embedding-Vektor fuer ein einzelnes Projekt berechnen (Admin)",
)
async def embed_project_vector(
    project_id: int,
    _: AdminUser,
    gjo_db: AsyncSession = Depends(get_gjo_se_db),
    embedding_service: EmbeddingService = Depends(get_embedding_service),
) -> dict[str, Any]:
    """Berechnet den Embedding-Vektor fuer genau ein Projekt.

    Exponiert ``EmbeddingService.embed_project`` fuer die Einzelprojekt-
    Pipeline und persistiert den Vektor auf ``project.vector``. Die
    ``openrouter:1``-Credentials werden intern ueber eine separate
    Core-Session aufgeloest.

    Vollstaendige Pipeline-Reihenfolge:
    ``merge-description`` → ``classify-skills`` → ``embed-vector`` →
    ``recalculate-score``.

    Args:
        project_id: Primary key des Projekts.
        _: Admin user (via dependency).
        gjo_db: gjo_se_com database connection (commit by caller).

    Returns:
        dict mit ``status``, ``project_id`` und ``has_vector``.

    Raises:
        HTTPException 404: Project not found.
    """
    from app.fbf.repositories import project_repository

    project = await project_repository.get_out_by_id(gjo_db, project_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        )

    await embedding_service.embed_project(project, gjo_db)
    await gjo_db.commit()
    return {"status": "completed", "project_id": project_id, "has_vector": True}


@router.post(
    "/batch-embed/backfill-project-vectors",
    status_code=status.HTTP_200_OK,
    summary="Einmaliger Backfill: bestehende Projekte ohne Vektor embedden (Admin)",
)
async def backfill_project_vectors(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    limit: int | None = Query(default=None, ge=1, description="Embed at most this many projects (validation run)."),
    embedding_client: EmbeddingClient = Depends(get_embedding_client),
) -> dict[str, Any]:
    """Idempotently embed all ``Project`` rows whose ``vector`` is NULL.

    Writes vectors into ``project.vector`` so dedup / Cousins / Endcustomer
    work without a fresh scraper run. ``limit`` supports a staged validation
    run.
    """
    from app.fbf.services.project_embedding_service import (
        backfill_project_vectors as run_backfill,
    )

    embedded = await run_backfill(db, limit=limit, embedding_client=embedding_client)
    return {"status": "completed", "embedded": embedded}
