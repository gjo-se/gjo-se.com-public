"""Aiscope admin endpoints: endcustomer candidate review."""

import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.repositories import project_endcustomer_candidate_repository as candidate_repo
from app.fbf.router.aiscope_endcustomer_candidate_action_router import (
    router as _aiscope_endcustomer_candidate_action_router,
)
from app.fbf.schemas.project_endcustomer_candidate_schemas import (
    ProjectEndcustomerCandidateOut,
)
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

logger = structlog.get_logger(__name__)


router = APIRouter()


@router.get(
    "/projects/{project_id}/endcustomer-candidates",
    response_model=list[ProjectEndcustomerCandidateOut],
    summary="Endkunden-Kandidaten eines Projekts abrufen (Admin)",
)
async def get_endcustomer_candidates(
    project_id: int,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[ProjectEndcustomerCandidateOut]:
    """Return non-rejected candidates from the latest research run.

    Sorted by ``confidence DESC``.
    """
    candidates = await candidate_repo.get_latest_by_project(db, project_id)
    return [
        ProjectEndcustomerCandidateOut.model_validate(c).model_copy(
            update={"status": sn, "status_color_token": sc},
        )
        for c, sn, sc in candidates
    ]


router.include_router(_aiscope_endcustomer_candidate_action_router)
