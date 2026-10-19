"""FastAPI routers for application-profile assets (public stream + admin listing).

Extracted from ``profile_router``: the public object-store stream and the admin
file-picker listing are asset concerns independent of the profile read/write
endpoints.
"""

from __future__ import annotations

from fastapi import APIRouter, Query
from fastapi.responses import Response

from app.shared.security.dependencies.auth_dependencies import AdminUser
from app.shared.storage.router.stream_router import stream_asset
from app.shared.storage.schemas.asset_schemas import AssetInfoOut
from app.shared.storage.services.asset_service import list_assets as list_central_assets

#: Public router (About page assets), mounted under ``/application-profile``.
router = APIRouter()
#: Admin router (asset listing), mounted under ``/application-profile``.
admin_router = APIRouter()


@router.get(
    "/stream/{storage_key:path}",
    summary="Stream a stored asset (e.g. profile photo, public)",
)
async def stream_asset_route(storage_key: str) -> Response:
    """Stream a stored object from the ObjectStore backend.

    Delegates to the shared :func:`stream_asset` handler (single source of
    truth) – the same SOTA pattern as the portfolio and generic stream.
    Any key can be streamed, so the frontend builds the URL from the
    stored key via its stream helper. Missing objects return 404 so
    browsers fall back to an alternative ``<source>``/``<img>`` (e.g. the
    PNG when a WebP variant does not exist).
    """
    return await stream_asset(storage_key)


@admin_router.get(
    "/assets",
    response_model=list[AssetInfoOut],
    summary="List object-store assets (admin)",
)
async def list_assets(
    _: AdminUser,
    prefix: str = Query("", description="ObjectStore key prefix to filter by"),
) -> list[AssetInfoOut]:
    """List object-store assets matching *prefix* for the file picker.

    Returns the sorted matching assets, each with its storage ``key``, the
    original filename ``name`` and the upload timestamp ``createdAt``. Pass a
    prefix to narrow the list, e.g. ``profile/`` for the portrait photo.

    Delegates to the central asset listing so no listing logic is duplicated.
    """
    return await list_central_assets(prefix)
