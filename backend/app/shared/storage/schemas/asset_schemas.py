"""Pydantic schemas for the central object-store asset module (gjo_se_com).

Defines the request/response models shared by the generic asset upload,
list and delete endpoints under ``/admin/object-store``.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AssetUploadOut(BaseModel):
    """Response returned by the central asset upload endpoint.

    Carries the generated storage key (``{prefix}/{uuid}.{ext}``) so the
    caller can reference the stored object afterwards. The original filename
    is stored as object metadata and echoed as ``name``. For raster uploads
    (PNG/JPEG) a set of WebP variants is derived and exposed via ``webpKeys``
    (``None`` for SVG/WebP uploads or when derivation fails). Both PNG and
    JPEG produce ratio-cropped variants keyed by ratio (``"16-9"``/``"21-9"``/
    ``"4-3"``) and width (800/1280/1920); PNG is lossless, JPEG lossy q85.
    """

    key: str
    webpKeys: dict[str, dict[str, str]] | None = None
    name: str


class AssetInfoOut(BaseModel):
    """A single asset entry returned by the asset listing endpoints.

    ``key`` is the stable UUID-based SSOT reference; ``name`` is the original
    filename (falls back to the key for legacy objects without metadata) and
    ``createdAt`` the upload timestamp (UTC).
    """

    key: str
    name: str
    createdAt: datetime


class AssetDeleteOut(BaseModel):
    """Response returned by the central asset delete endpoint.

    Echoes the deleted storage key for confirmation.
    """

    key: str
