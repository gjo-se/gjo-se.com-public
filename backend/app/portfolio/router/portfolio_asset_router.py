"""Portfolio-Stream-Router – streamt Assets vom ObjectStore (S3/MinIO oder LocalFileStore) an den Browser.

Delegiert auf den generischen :func:`stream_asset` Handler aus dem
``storage``-Modul – keine duplizierte Stream-/Content-Type-Logik.
"""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import Response

from app.shared.storage.router.stream_router import stream_asset

portfolio_asset_router = APIRouter(prefix="/portfolio", tags=["portfolio · stream · public"])


@portfolio_asset_router.get("/stream/{storage_key:path}")
async def stream_portfolio_asset(storage_key: str) -> Response:
    """Stream a portfolio asset from the ObjectStore backend.

    Delegates to the shared :func:`stream_asset` handler (single source of
    truth). Fetching happens internally (no public hostname required) –
    works with any ObjectStore backend (S3/MinIO presigned URLs or local
    file paths).

    Args:
        storage_key: ObjectStore key – may include path segments
            (e.g. ``portfolio-assets/foo_light.svg``).
    """
    return await stream_asset(storage_key)
