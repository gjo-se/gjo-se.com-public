"""Public-asset key/URL helpers (gjo_se_com).

Single source of truth for which ObjectStore prefixes are public website
images and how to build their CloudFront URL. Split out of
:mod:`app.shared.storage.infrastructure.streaming_client` – the public-prefix /
CDN concern is independent of the streaming concern.
"""

from __future__ import annotations

from app.shared.config.config import settings

# Public-Prefix-SSOT (Zugriffsmuster f-2): nur diese Objekt-Prefixe sind öffentliche
# Website-Bilder (Portfolio + Profilfoto). Alles andere (technology-catalog/*, ...) ist privat.
PUBLIC_ASSET_PREFIXES = ("portfolio/", "profile/")


def is_public_asset_key(storage_key: str) -> bool:
    """True, wenn der Key unter einem öffentlichen Website-Bild-Prefix liegt."""
    return storage_key.startswith(PUBLIC_ASSET_PREFIXES)


def public_cdn_url_for(storage_key: str) -> str | None:
    """CF-URL für public Keys, sobald OBJECT_STORE_S3_PUBLIC_CDN_URL gesetzt ist (prod).

    Args:
        storage_key: ObjectStore key – may include path segments.

    Returns:
        Die absolute CloudFront-URL für den Key, oder ``None`` wenn der Key nicht
        öffentlich ist bzw. keine CDN-Domain konfiguriert ist (dev).
    """
    base = settings.OBJECT_STORE_S3_PUBLIC_CDN_URL
    if base and is_public_asset_key(storage_key):
        return f"{base.rstrip('/')}/{storage_key}"
    return None
