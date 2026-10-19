"""Aiscope admin endpoints: endcustomer candidate review actions."""

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.services.endcustomer_service import (
    confirm_candidate,
    reject_candidate,
)
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


@router.post(
    "/endcustomer-candidates/{candidate_id}/confirm",
    summary="Endkunden-Kandidat bestätigen (Admin)",
)
async def confirm_endcustomer_candidate(
    candidate_id: int,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> dict[str, Any]:
    """Confirm a candidate: accept + CRM company/person creation."""
    return await confirm_candidate(db, candidate_id)


@router.post(
    "/endcustomer-candidates/{candidate_id}/reject",
    summary="Endkunden-Kandidat verwerfen (Admin)",
)
async def reject_endcustomer_candidate(
    candidate_id: int,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> dict[str, Any]:
    """Reject a candidate (status → rejected)."""
    return await reject_candidate(db, candidate_id)
