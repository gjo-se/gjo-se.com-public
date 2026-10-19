"""Shared object-store streaming helpers (gjo_se_com).

Single source of truth for streaming stored objects to the browser and
mapping a storage key's extension to its media type. Every domain's
generic stream endpoint (portfolio, application-profile, ...) uses these
helpers instead of duplicating ``_content_type_for`` / stream logic.

The public-prefix / CDN-URL helpers live in :mod:`public_asset_client`.
"""

from __future__ import annotations

import httpx
from fastapi.responses import StreamingResponse

from app.shared.storage.domain.base_contract import ObjectNotFoundError
from app.shared.storage.infrastructure.factory_client import get_object_store

# Cache-Control shared by all stream endpoints (portrait, proofs, heroes, ...).
STREAM_CACHE_HEADERS = {"Cache-Control": "public, max-age=3600"}


def content_type_for(storage_key: str) -> str:
    """Map a storage key's file extension to its media type.

    Args:
        storage_key: ObjectStore key – may include path segments.

    Returns:
        Media type for the file extension, or ``application/octet-stream``
        as fallback for unknown extensions.
    """
    if storage_key.endswith(".svg"):
        return "image/svg+xml"
    if storage_key.endswith(".webp"):
        return "image/webp"
    if storage_key.endswith(".png"):
        return "image/png"
    if storage_key.endswith((".jpeg", ".jpg")):
        return "image/jpeg"
    return "application/octet-stream"


async def stream_object(storage_key: str) -> StreamingResponse:
    """Stream an object from the ObjectStore backend to the browser.

    Fetches the object internally (no public hostname required) and streams
    it to the browser. Works with any ObjectStore backend (S3/MinIO presigned
    URLs or local file paths).

    Args:
        storage_key: ObjectStore key – may include path segments.

    Returns:
        A StreamingResponse with the object's bytes and a short-lived cache.

    Raises:
        ObjectNotFoundError: If the object does not exist in the store. Callers
            (routers) translate this into an HTTP 404 so browsers fall back to
            an alternative ``<source>``/``<img>`` instead of a silent empty body.
    """
    store = get_object_store()
    if not await store.exists(storage_key):
        raise ObjectNotFoundError(storage_key)

    url = await store.get_url(storage_key)

    async def content_stream():
        """Yield the object bytes from the resolved URL in 64 KiB chunks.

        Yields:
            Successive byte chunks of the remote object.
        """
        async with httpx.AsyncClient(timeout=30.0) as client, client.stream("GET", url) as response:
            response.raise_for_status()
            async for chunk in response.aiter_bytes(chunk_size=65536):
                yield chunk

    return StreamingResponse(
        content_stream(),
        media_type=content_type_for(storage_key),
        headers=STREAM_CACHE_HEADERS,
    )
