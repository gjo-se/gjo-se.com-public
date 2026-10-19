"""Aiscope admin endpoints: deterministic hourly-rate estimation."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.schemas.project_schemas import ProjectRateEstimateOut
from app.fbf.services import project_rate_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.ports.application import ApplicationBridgePort, get_application_bridge_port
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


@router.post(
    "/projects/{project_id}/hourly-rate/estimate",
    response_model=ProjectRateEstimateOut,
    status_code=status.HTTP_200_OK,
    summary="Stundensatz deterministisch schätzen und speichern (Admin)",
)
async def estimate_project_hourly_rate_endpoint(
    project_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    application_bridge: ApplicationBridgePort = Depends(get_application_bridge_port),
) -> ProjectRateEstimateOut:
    """Estimates the offer hourly rate (EUR/h) and persists ``project.hourly_rate``.

    Deterministic two-layer rule engine (Basisrate aus dem Profil ×
    Projekt-/Länderfaktoren) – **kein** LLM-Call. Persistiert wird ausschließlich
    der Deckel (``hourly_rate``); ``my_hourly_rate`` bleibt unangetastet.

    Args:
        project_id: Primary key of the master project.
        _: Admin user (via dependency).
        db: Database connection.

    Returns:
        Estimate incl. applied factors and uncertainties.

    Raises:
        HTTPException 404: Project or application profile not found.
        HTTPException 422: Project is a slave or the profile base rate is unset.
    """
    return await project_rate_service.estimate_and_persist(db, project_id, application_bridge)
