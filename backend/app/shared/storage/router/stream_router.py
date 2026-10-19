"""Generic object-store stream router (gjo_se_com).

Single generic stream endpoint ``GET /stream/{storage_key}`` that streams
any stored object from the ObjectStore backend to the browser. Domain
stream routers (portfolio, application-profile, icons, ...) reuse the
shared :func:`stream_asset` handler so no stream/content-type logic is
duplicated – :mod:`app.shared.storage.infrastructure.streaming_client` stays the SSOT.

Zugriffsmuster (f-2): public Keys werden in prod per 302 auf die Asset-
CloudFront-Distribution redirectet; private Keys sind über die generische
Route nicht abrufbar (404). Nur auth-geschützte Router (z. B. Icons)
erlauben private Keys via ``allow_private=True``.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import RedirectResponse, Response

from app.shared.storage.domain.base_contract import ObjectNotFoundError
from app.shared.storage.infrastructure.public_asset_client import (
    is_public_asset_key,
    public_cdn_url_for,
)
from app.shared.storage.infrastructure.streaming_client import stream_object

stream_router = APIRouter(tags=["storage · stream · public"])


async def stream_asset(storage_key: str, *, allow_private: bool = False) -> Response:
    """Stream a stored object (or redirect public keys to CloudFront).

    Shared handler used by the generic stream router and all domain
    stream routers (portfolio, application-profile, icons, ...).

    Args:
        storage_key: ObjectStore key – may include path segments.
        allow_private: True für auth-geschützte Router (z. B. Icons), die
            auch private Prefixe als Backend-Proxy ausliefern dürfen.

    Returns:
        Ein 302-Redirect auf die Asset-CloudFront-Distribution (prod, public
        Keys) oder eine StreamingResponse mit den Objekt-Bytes (dev/private).

    Raises:
        HTTPException: 404 wenn das Objekt fehlt oder der Key über eine
            öffentliche Route privat ist (kein Proxy-Leak über Key-Raten).
    """
    # prod + public Prefix: 302 auf die Asset-CloudFront-Distribution (f-1).
    # Kein exists()-Precheck: CF/S3 liefern bei fehlendem Objekt 404/403 →
    # Browser-<picture>-Fallback.
    cdn_url = public_cdn_url_for(storage_key)
    if cdn_url:
        return RedirectResponse(cdn_url, status_code=status.HTTP_302_FOUND)

    is_public = is_public_asset_key(storage_key)
    if not is_public and not allow_private:
        # private Keys sind über öffentliche Routen nicht abrufbar (kein Leak über Key-Raten)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Object not found: {storage_key}")

    # Proxy-Pfad (public ohne CF-Config [dev] ODER allow_private [Icons]) – wie bisher:
    try:
        return await stream_object(storage_key)
    except ObjectNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Object not found: {storage_key}",
        ) from exc


@stream_router.get(
    "/stream/{storage_key:path}",
    summary="Stream a stored object by its storage key",
)
async def stream_object_by_key(storage_key: str) -> Response:
    """Stream any stored object (PNG/WebP/SVG/...) by its storage key.

    Generic endpoint – the storage key IS the path. Public keys werden in
    prod auf CloudFront redirectet (302); private Keys liefern 404. Returns
    404 when the object does not exist so the browser can fall back gracefully.
    """
    return await stream_asset(storage_key)
