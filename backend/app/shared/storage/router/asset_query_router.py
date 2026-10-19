"""FastAPI admin router for object-store asset reads (gjo_se_com).

Provides the list endpoint for ObjectStore image assets. Registered under the
admin layer at ``/admin/object-store`` (see ``app/api/v1/router.py``). The
write endpoints live in :mod:`asset_router`.
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.shared.security.dependencies.auth_dependencies import AdminUser
from app.shared.storage.schemas.asset_schemas import AssetInfoOut
from app.shared.storage.services.asset_service import list_assets

router = APIRouter()


@router.get(
    "/assets",
    response_model=list[AssetInfoOut],
    summary="List assets (admin)",
)
async def list_assets_endpoint(
    _: AdminUser,
    prefix: str = Query("", description="ObjectStore key prefix to filter by"),
) -> list[AssetInfoOut]:
    """List the assets matching ``prefix``.

    Returns the sorted matching assets, each with its storage ``key``, the
    original filename ``name`` and the upload timestamp ``createdAt``.
    """
    return await list_assets(prefix)
