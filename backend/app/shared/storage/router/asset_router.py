"""FastAPI admin router for object-store asset writes (gjo_se_com).

Provides upload / delete endpoints for ObjectStore image assets. Registered
under the admin layer at ``/admin/object-store`` (see ``app/api/v1/router.py``).
The read endpoint lives in :mod:`asset_query_router`.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.shared.security.dependencies.auth_dependencies import AdminUser
from app.shared.storage.domain.base_contract import ObjectNotFoundError
from app.shared.storage.exceptions import ImageTooLargeError, InvalidImageTypeError
from app.shared.storage.schemas.asset_schemas import AssetDeleteOut, AssetUploadOut
from app.shared.storage.services.asset_service import (
    AssetNameConflictError,
    delete_asset,
    upload_asset,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/assets",
    response_model=AssetUploadOut,
    status_code=status.HTTP_201_CREATED,
    summary="Upload an asset (admin)",
)
async def upload_asset_endpoint(
    _: AdminUser,
    file: UploadFile = File(...),
    prefix: str | None = Form(
        None,
        description="Optional ObjectStore key prefix (folder) to store the asset in",
    ),
) -> AssetUploadOut:
    """Validate and store an image asset, returning its generated key.

    Multipart upload accepting SVG/PNG/JPEG/WebP up to 5 MB. The asset is
    stored under ``{prefix}/{uuid}.{ext}`` and the generated key is returned
    so the caller can reference the object (e.g. via the streaming endpoint).

    Raises:
        422: Unsupported content type.
        413: File exceeds 5 MB.
        409: An asset with the same filename already exists in the folder.
    """
    try:
        result = await upload_asset(file, prefix)
    except InvalidImageTypeError as exc:
        logger.warning("asset upload failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except ImageTooLargeError as exc:
        logger.warning("asset upload failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=str(exc),
        ) from exc
    except AssetNameConflictError as exc:
        logger.warning("asset upload failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    return result


@router.delete(
    "/assets/{key:path}",
    response_model=AssetDeleteOut,
    summary="Delete an asset (admin)",
)
async def delete_asset_endpoint(
    _: AdminUser,
    key: str,
) -> AssetDeleteOut:
    """Delete the asset identified by ``key``.

    The ``:path`` converter allows keys containing path segments (e.g.
    ``profile/abc123.jpg``).

    Raises:
        404: The object does not exist in the store.
    """
    try:
        deleted = await delete_asset(key)
    except ObjectNotFoundError as exc:
        logger.warning("asset delete failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    return AssetDeleteOut(key=deleted)
