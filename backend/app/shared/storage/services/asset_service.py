"""Business logic for the central object-store asset module (gjo_se_com).

Single source of truth for uploading, listing and deleting generic image
assets in the ObjectStore. The previous per-domain upload services duplicated
the content-type/size validation and key generation; this module centralises
them so a new image kind only needs a new prefix, not new upload code.
"""

from __future__ import annotations

import io
import re
from pathlib import Path
from uuid import uuid4

import structlog
from fastapi import UploadFile
from PIL import Image, ImageOps

from app.shared.storage.domain.base_contract import ObjectInfo, ObjectNotFoundError
from app.shared.storage.exceptions import ImageTooLargeError, InvalidImageTypeError
from app.shared.storage.infrastructure.factory_client import get_object_store
from app.shared.storage.schemas.asset_schemas import AssetInfoOut, AssetUploadOut

logger = structlog.get_logger(__name__)

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB

# Target widths (px) for the responsive WebP variant set. Both PNG and JPEG
# masters get one WebP per ratio and width; only the encoder differs (PNG
# lossless, JPEG lossy q85).
WEBP_WIDTHS: tuple[int, ...] = (800, 1280, 1920)

# Target aspect ratios for the cropped variant set derived from the 16:9
# master (Ticket A guarantees the centered safe area for the crops).
WEBP_RATIOS: tuple[str, ...] = ("16-9", "21-9", "4-3")

# Matches derived WebP variant basenames: any ``.webp`` file whose stem has
# an extra segment before the extension – width variants
# (``{stem}.{width}.webp``), ratio variants (``{stem}.{ratio}.{width}.webp``)
# and the legacy JPEG variant (``{stem}.orig.orig.webp``). Masters are always
# ``{uuid}.{ext}`` with a dot-free stem, so they never match. Applied to the
# basename only, so dots in folder names cannot cause false positives.
DERIVED_VARIANT_RE = re.compile(r"\.[^.]+\.webp$")

# content_type → file extension used in the generated storage key.
ALLOWED_IMAGE_TYPES: dict[str, str] = {
    "image/svg+xml": ".svg",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}


class AssetNameConflictError(ValueError):
    """Raised when an asset with the same original filename already exists in the same folder (prefix)."""


def _derive_webp_set(data: bytes, ext: str) -> dict[str, dict[str, bytes]]:
    """Derive responsive WebP variants from a raster image.

    PNG and JPEG inputs share the same ratio × width variant set: a WebP per
    aspect ratio in :data:`WEBP_RATIOS` (center-cropped from the 16:9 master)
    and per target width in :data:`WEBP_WIDTHS` (only down-scaled, never
    up-scaled). Only the encoder differs – PNG is **lossless**, JPEG is
    **lossy** (quality 85). The master format never changes the output schema,
    so the frontend is format-agnostic. SVG stays vector and is skipped.

    A per-variant failure is logged as a warning and the variant is simply
    omitted from the result so the original upload is never aborted.

    Args:
        data: The raw image bytes of the uploaded asset.
        ext: The validated file extension (``.png``/``.jpg``/``.svg``/``.webp``).

    Returns:
        Mapping of ratio-label (``"16-9"``, ``"21-9"``, ``"4-3"``) to a mapping
        of width-label (``"800"``, ``"1280"``, ``"1920"``) to WebP-encoded
        bytes. Empty for SVG/WebP originals or total failure.
    """
    if ext not in {".png", ".jpg"}:
        return {}
    variants: dict[str, dict[str, bytes]] = {}
    try:
        with Image.open(io.BytesIO(data)) as source:
            # EXIF-Orientierung anwenden, damit das WebP korrekt ausgerichtet ist
            image = ImageOps.exif_transpose(source) if "exif" in source.info else source
            # Farbprofil sichern (JPEG/PNG können ein ICC-Profil tragen)
            icc = image.info.get("icc_profile")
            # JPEG -> RGB; PNG mit Alpha -> RGBA (Farbtreue, kein unnötiges RGBA)
            mode = "RGBA" if (ext == ".png" and "A" in image.getbands()) else "RGB"
            base = image.convert(mode)

            # Gemeinsamer Ratio × Breite-Pfad – Encoder je Master-Format.
            encode_kwargs: dict[str, object] = (
                {"lossless": True, "method": 6} if ext == ".png" else {"quality": 85, "method": 6}
            )
            if icc:
                encode_kwargs["icc_profile"] = icc
            for ratio in WEBP_RATIOS:
                try:
                    cropped = _ratio_crop(base, ratio)
                    for width in WEBP_WIDTHS:
                        try:
                            out = _downscale(cropped, width)
                            buffer = io.BytesIO()
                            out.save(buffer, "WEBP", **encode_kwargs)
                            variants.setdefault(ratio, {})[str(width)] = buffer.getvalue()
                        except Exception:
                            logger.exception("webp variant failed", ratio=ratio, width=width)
                except Exception:
                    logger.exception("webp ratio crop failed", ratio=ratio)
    except Exception:
        logger.exception("webp derivation failed")
    return variants


def _ratio_crop(image: Image.Image, ratio: str) -> Image.Image:
    """Crop *image* to the target aspect *ratio* (e.g. ``"21-9"``).

    The crop is anchored to keep content that must stay visible:
    - ``21-9`` (trims height) is anchored **top** – the upper part stays,
      the bottom is trimmed.
    - ``4-3`` (trims width) is anchored **left** – the left part stays, the
      right is trimmed.
    - ``16-9`` matches the master and is returned unchanged.

    Top/left anchoring is intentional: informative content near the top edge
    (21:9 cards) or left edge (4:3) is never cut off; bottom and right trims
    are visually easier to tolerate than cutting into content.

    Args:
        image: The decoded master image (already EXIF-transposed).
        ratio: Target aspect ratio as ``"{w}-{h}"`` label from
            :data:`WEBP_RATIOS`.

    Returns:
        The cropped image (or *image* itself if it already matches).
    """
    ratio_w, ratio_h = (int(part) for part in ratio.split("-"))
    target = ratio_w / ratio_h
    current = image.width / image.height
    if current > target:  # too wide -> trim width, keep full height (left-anchored)
        new_width = max(1, round(image.height * target))
        return image.crop((0, 0, new_width, image.height))
    if current < target:  # too tall -> trim height, keep full width (top-anchored)
        new_height = max(1, round(image.width / target))
        return image.crop((0, 0, image.width, new_height))
    return image


def _downscale(image: Image.Image, target_width: int) -> Image.Image:
    """Return a copy of *image* resized to *target_width* (only down, never up).

    Aspect ratio is preserved. If the image is already narrower than
    *target_width* it is returned unchanged.
    """
    if image.width <= target_width:
        return image
    ratio = target_width / image.width
    target_height = max(1, round(image.height * ratio))
    return image.resize((target_width, target_height), Image.Resampling.LANCZOS)


async def upload_asset(file: UploadFile, prefix: str | None = None) -> AssetUploadOut:
    """Validate an image upload, store it and return the generated key(s).

    The key is ``{prefix}/{uuid}.{ext}`` (no folder when ``prefix`` is empty),
    the extension being derived from the validated content type. Re-uploads
    always generate a fresh UUID, so nothing is ever overwritten. The original
    filename is stored as object metadata and echoed as ``name``. For raster
    uploads (PNG/JPEG) an additional set of WebP variants is derived and
    exposed via ``webpKeys`` (``None`` otherwise). Both PNG and JPEG produce
    ratio-cropped variants (16-9/21-9/4-3) at 800/1280/1920px keyed by ratio
    and width (PNG lossless, JPEG lossy q85) – the output schema is
    format-independent.

    Args:
        file: The multipart-uploaded image file.
        prefix: Optional ObjectStore key prefix (folder) to store the asset in.

    Returns:
        An :class:`AssetUploadOut` with the original ``key``, the echoed
        original filename ``name`` and an optional ``webpKeys`` mapping
        (ratio → width-label → storage key) for the derived WebP variants.
        Independent of whether the master was a PNG or a JPEG.

    Raises:
        InvalidImageTypeError: If the content type is not SVG/PNG/JPEG/WebP.
        ImageTooLargeError: If the file exceeds 5 MB.
        AssetNameConflictError: If an asset with the same original filename
            already exists in the same folder (``prefix``).
    """
    extension = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
    if extension is None:
        logger.warning("unsupported asset content type: %s", file.content_type)
        raise InvalidImageTypeError(
            f"Nicht unterstützter Content-Type '{file.content_type}' – erlaubt sind SVG, PNG, JPEG und WebP"
        )

    data = await file.read()
    if len(data) > MAX_IMAGE_SIZE:
        logger.warning("asset too large: size=%s", len(data))
        raise ImageTooLargeError("Bild darf maximal 5 MB groß sein")

    # Namenssperre pro Ordner: Ein Asset mit demselben Original-Dateinamen darf
    # im selben prefix nicht erneut hochgeladen werden (kein Duplikat im Picker).
    # Gleichnamige Dateien in verschiedenen Ordnern bleiben erlaubt.
    name = file.filename or ""
    existing = await list_assets(prefix or "")
    if any(asset.name == name for asset in existing):
        logger.warning("asset name conflict", name=name, prefix=prefix)
        raise AssetNameConflictError(f"Ein Asset mit dem Namen '{name}' existiert bereits in diesem Ordner")

    base = uuid4().hex
    key = f"{prefix}/{base}{extension}" if prefix else f"{base}{extension}"
    metadata = {"filename": name}
    await get_object_store().put(key, data, metadata=metadata)
    logger.info("asset uploaded", key=key, name=name)

    webp_keys: dict[str, dict[str, str]] | None = None
    variants = _derive_webp_set(data, extension)
    if variants:
        webp_keys = {}
        for ratio, width_variants in variants.items():
            for width_label, webp_data in width_variants.items():
                webp_key = (
                    f"{prefix}/{base}.{ratio}.{width_label}.webp" if prefix else f"{base}.{ratio}.{width_label}.webp"
                )
                await get_object_store().put(webp_key, webp_data, metadata=metadata)
                webp_keys.setdefault(ratio, {})[width_label] = webp_key
                logger.info("webp variant derived", key=webp_key, ratio=ratio, width=width_label)

    return AssetUploadOut(key=key, webpKeys=webp_keys, name=name)


def _is_derived_variant(key: str) -> bool:
    """Return whether *key* is a derived WebP variant rather than a master.

    A key counts as derived when its basename matches
    :data:`DERIVED_VARIANT_RE`, i.e. it is a ``.webp`` file with at least one
    extra segment before the extension (``{stem}.{width}.webp`` or
    ``{stem}.{ratio}.{width}.webp``). Master uploads
    (``{uuid}.png|.jpg|.svg|.webp`` – exactly one extension, no extra
    segment) never match.

    Args:
        key: The ObjectStore key to classify.

    Returns:
        True if the key denotes a derived variant, False for masters.
    """
    basename = key.rsplit("/", 1)[-1]
    return DERIVED_VARIANT_RE.search(basename) is not None


def _is_legacy_webp_variant(key: str, raster_stems: set[str]) -> bool:
    """Return whether *key* is a legacy pre-variant WebP derivative.

    Before the ratio/width variant schema existed, raster uploads stored a
    single derived ``{stem}.webp`` next to their master (``{stem}.png`` /
    ``{stem}.jpg``). Such keys share their extension-less key with a raster
    master in the same listing and are hidden from the picker as well
    (``delete_asset`` already treats them as cascade variants). A genuine
    WebP master upload (``{uuid}.webp`` without a raster counterpart) is
    kept.

    Args:
        key: The ObjectStore key to classify.
        raster_stems: Extension-less keys of the raster masters in the
            listing (folder included, so equal stems in different folders
            cannot collide).

    Returns:
        True if the key denotes a legacy WebP derivative, False otherwise.
    """
    if not key.endswith(".webp"):
        return False
    return key[: key.rfind(".")] in raster_stems


def _master_objects(objects: list[ObjectInfo]) -> list[ObjectInfo]:
    """Filter a raw object listing down to the master assets.

    Removes derived WebP variants: segment variants matched by
    :data:`DERIVED_VARIANT_RE` and legacy ``{stem}.webp`` derivatives that
    share their extension-less key with a raster master. Genuine WebP
    masters (no raster counterpart) are kept.

    Args:
        objects: Raw object listing from :meth:`ObjectStore.list`.

    Returns:
        Only the master objects, in listing order.
    """
    masters = [obj for obj in objects if not _is_derived_variant(obj.key)]
    raster_stems = {obj.key[: obj.key.rfind(".")] for obj in masters if not obj.key.endswith(".webp")}
    return [obj for obj in masters if not _is_legacy_webp_variant(obj.key, raster_stems)]


async def list_assets(prefix: str = "") -> list[AssetInfoOut]:
    """Return the matching master assets with key, original name and upload time.

    Central listing entry point shared by the generic asset endpoint and the
    legacy domain listings (application-profile, portfolio) so the listing
    logic is not duplicated. Derived WebP variants are filtered out – only
    master uploads are selectable assets (one master = one logical image;
    the FE derives variants itself). This covers the ratio/width variants
    (``{stem}.{width}.webp`` / ``{stem}.{ratio}.{width}.webp``) and the
    legacy pre-variant derivatives (``{stem}.webp`` next to a raster
    master); genuine WebP masters are kept.

    Args:
        prefix: Key prefix to filter by (relative to the store root).

    Returns:
        Sorted list of matching master assets as :class:`AssetInfoOut`.
    """
    objects = await get_object_store().list(prefix)
    return [AssetInfoOut(key=obj.key, name=obj.name, createdAt=obj.createdAt) for obj in _master_objects(objects)]


async def delete_asset(key: str) -> str:
    """Delete an asset and all its derived WebP variants from the ObjectStore.

    The WebP variants share the key stem of the original (``{stem}.*.webp`` –
    legacy width keys like ``a/b.800.webp`` as well as ratio keys like
    ``a/b.21-9.1920.webp`` and the pre-variant single key ``a/b.webp``) and
    are deleted alongside the original so no orphaned WebP artifact remains.
    Missing variants are ignored (e.g. SVG or WebP originals have none);
    errors on the original key still propagate.

    Args:
        key: ObjectStore key to remove.

    Returns:
        The deleted storage key.

    Raises:
        ObjectNotFoundError: If the key does not exist in the store.
    """
    await get_object_store().delete(key)
    logger.info("asset deleted", key=key)
    path = Path(key)
    prefix = f"{path.parent}/" if path.parent != Path(".") else ""
    stem_prefix = f"{prefix}{path.stem}."
    exact_webp = f"{prefix}{path.stem}.webp"
    objects = await get_object_store().list(prefix)
    variant_keys = [
        obj.key
        for obj in objects
        if obj.key == exact_webp or (obj.key.startswith(stem_prefix) and obj.key.endswith(".webp"))
    ]
    for webp_variant in variant_keys:
        try:
            await get_object_store().delete(webp_variant)
            logger.info("webp variant deleted", key=webp_variant)
        except ObjectNotFoundError:
            logger.info("no webp variant to delete", key=webp_variant)
    return key
