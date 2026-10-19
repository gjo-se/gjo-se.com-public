"""Icon-Stream-Router – streamt Icons vom ObjectStore (S3/MinIO oder LocalFileStore) direkt an den Browser.

Delegiert auf den generischen :func:`stream_asset` Handler aus dem
``storage``-Modul – keine duplizierte Stream-/Content-Type-Logik.
technology-catalog-Icons sind privat (f-2) und nur mit gültigem Admin-JWT
als Backend-Proxy erreichbar (``allow_private=True``).
"""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import Response

from app.shared.security.dependencies.auth_dependencies import AdminUser
from app.shared.storage.router.stream_router import stream_asset

icon_router = APIRouter(prefix="/technology-catalog/icons", tags=["technology-catalog · icons · public"])


@icon_router.get("/stream/{storage_key:path}")
async def stream_icon(storage_key: str, _: AdminUser) -> Response:
    """Stream icon content from the ObjectStore backend – Admin-JWT required.

    technology-catalog-Icons sind privat: nur Admins (Admin-JWT, same-origin
    Cookie) erreichen sie über diese Route als Backend-Proxy; die offene
    generische Route liefert für private Keys 404, CloudFront (f-1) erlaubt
    nur ``portfolio/*``+``profile/*``.

    Args:
        storage_key: ObjectStore key – may include path segments
            (e.g. ``technology-catalog/foo_light.svg``).
    """
    return await stream_asset(storage_key, allow_private=True)
