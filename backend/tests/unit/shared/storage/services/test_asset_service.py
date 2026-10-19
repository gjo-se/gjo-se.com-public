"""Unit tests for the asset-service image/key helpers and store-facing flows."""

from __future__ import annotations

import io
from datetime import UTC, datetime
from typing import Any

import pytest
from PIL import Image

from app.shared.storage.domain.base_contract import ObjectInfo, ObjectNotFoundError
from app.shared.storage.exceptions import ImageTooLargeError, InvalidImageTypeError
from app.shared.storage.services import asset_service
from app.shared.storage.services.asset_service import (
    AssetNameConflictError,
    _derive_webp_set,
    _downscale,
    _is_derived_variant,
    _is_legacy_webp_variant,
    _master_objects,
    _ratio_crop,
    delete_asset,
    upload_asset,
)

pytestmark = pytest.mark.unit

_TS = datetime(2026, 1, 1, tzinfo=UTC)


def _info(key: str) -> ObjectInfo:
    """Build object metadata for the given key."""
    return ObjectInfo(key=key, name=key.rsplit("/", 1)[-1], createdAt=_TS)


# ── key classification ───────────────────────────────────────────────────────


def test_is_derived_variant_matches_width_and_ratio_keys() -> None:
    """Width and ratio WebP variants are derived; masters are not."""
    assert _is_derived_variant("p/abc.800.webp") is True
    assert _is_derived_variant("p/abc.21-9.1920.webp") is True
    assert _is_derived_variant("p/abc.png") is False
    assert _is_derived_variant("p/abc.webp") is False


def test_is_derived_variant_classifies_using_the_basename_only() -> None:
    """Only the basename is matched, so a deep folder path still classifies correctly."""
    assert _is_derived_variant("a/b/abc.800.webp") is True
    assert _is_derived_variant("a/b/abc.png") is False


def test_is_legacy_webp_variant_true_only_with_raster_stem() -> None:
    """A ``.webp`` key sharing a raster master stem is a legacy derivative."""
    assert _is_legacy_webp_variant("p/abc.webp", {"p/abc"}) is True
    assert _is_legacy_webp_variant("p/abc.webp", set()) is False
    assert _is_legacy_webp_variant("p/abc.png", {"p/abc"}) is False


def test_master_objects_filters_derived_and_legacy_variants() -> None:
    """Only the raster master survives the master-objects filter."""
    objects = [
        _info("p/abc.png"),
        _info("p/abc.800.webp"),
        _info("p/abc.21-9.1920.webp"),
        _info("p/abc.webp"),
    ]

    masters = _master_objects(objects)

    assert [obj.key for obj in masters] == ["p/abc.png"]


def test_master_objects_keeps_genuine_webp_master() -> None:
    """A WebP master without a raster counterpart is kept."""
    objects = [_info("p/xyz.webp"), _info("p/xyz.800.webp")]

    masters = _master_objects(objects)

    assert [obj.key for obj in masters] == ["p/xyz.webp"]


# ── image transforms ─────────────────────────────────────────────────────────


def test_downscale_never_upscales_smaller_images() -> None:
    """An image narrower than the target width is returned unchanged."""
    image = Image.new("RGB", (100, 50))

    assert _downscale(image, 800).size == (100, 50)


def test_downscale_preserves_aspect_ratio() -> None:
    """A wider image is scaled down to the target width with the ratio kept."""
    image = Image.new("RGB", (1600, 800))

    assert _downscale(image, 800).size == (800, 400)


def test_ratio_crop_trims_height_for_wider_ratio() -> None:
    """Cropping to 21:9 keeps full width and trims the height (top-anchored)."""
    image = Image.new("RGB", (1920, 1080))

    cropped = _ratio_crop(image, "21-9")

    assert cropped.width == 1920
    assert cropped.height == round(1920 * 9 / 21)


def test_ratio_crop_trims_width_for_narrower_ratio() -> None:
    """Cropping to 4:3 keeps full height and trims the width (left-anchored)."""
    image = Image.new("RGB", (1920, 1080))

    cropped = _ratio_crop(image, "4-3")

    assert cropped.height == 1080
    assert cropped.width == round(1080 * 4 / 3)


def test_ratio_crop_returns_unchanged_when_ratio_matches() -> None:
    """A master already matching 16:9 is returned unchanged."""
    image = Image.new("RGB", (1920, 1080))

    cropped = _ratio_crop(image, "16-9")

    assert cropped.size == (1920, 1080)
    assert cropped is image


# ── _derive_webp_set ─────────────────────────────────────────────────────────


def _png_bytes(size: tuple[int, int] = (100, 50), mode: str = "RGB") -> bytes:
    buffer = io.BytesIO()
    Image.new(mode, size).save(buffer, "PNG")
    return buffer.getvalue()


def _jpg_bytes(size: tuple[int, int] = (100, 50)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", size).save(buffer, "JPEG")
    return buffer.getvalue()


@pytest.mark.parametrize("ext", [".svg", ".webp"])
def test_derive_webp_set_returns_empty_for_non_raster(ext: str) -> None:
    """SVG and WebP masters produce no derived variants."""
    assert _derive_webp_set(_png_bytes(), ext) == {}


@pytest.mark.parametrize(
    ("data", "ext"),
    [(_png_bytes(mode="RGBA"), ".png"), (_jpg_bytes(), ".jpg")],
)
def test_derive_webp_set_builds_full_ratio_width_grid(data: bytes, ext: str) -> None:
    """Raster masters produce a 3-ratio × 3-width WebP variant grid."""
    variants = _derive_webp_set(data, ext)

    assert set(variants) == {"16-9", "21-9", "4-3"}
    for width_variants in variants.values():
        assert set(width_variants) == {"800", "1280", "1920"}


def test_derive_webp_set_png_is_lossless_rgba_jpeg_is_lossy_rgb(monkeypatch: pytest.MonkeyPatch) -> None:
    """PNG encodes lossless RGBA; JPEG encodes lossy (q85) RGB."""
    png_data = _png_bytes(mode="RGBA")
    jpg_data = _jpg_bytes()
    calls: list[tuple[str, dict[str, object]]] = []
    real_save = Image.Image.save

    def _spy(self: Image.Image, fp: Any, fmt: str | None = None, **kw: object) -> None:
        if fmt == "WEBP":
            calls.append((self.mode, dict(kw)))
        real_save(self, fp, fmt, **kw)

    monkeypatch.setattr(Image.Image, "save", _spy)

    _derive_webp_set(png_data, ".png")
    assert calls
    assert all(mode == "RGBA" for mode, _ in calls)
    assert all(kw.get("lossless") is True and "quality" not in kw for _, kw in calls)

    calls.clear()
    _derive_webp_set(jpg_data, ".jpg")
    assert calls
    assert all(mode == "RGB" for mode, _ in calls)
    assert all(kw.get("quality") == 85 and "lossless" not in kw for _, kw in calls)


def test_max_image_size_equals_five_megabytes() -> None:
    """The upload limit is exactly 5 MiB (contract with the frontend)."""
    assert asset_service.MAX_IMAGE_SIZE == 5 * 1024 * 1024


# ── upload_asset / list / delete (fake object store) ─────────────────────────


class _FakeUpload:
    """Minimal UploadFile double with a content type, filename and bytes."""

    def __init__(self, content_type: str, filename: str, data: bytes) -> None:
        self.content_type = content_type
        self.filename = filename
        self._data = data

    async def read(self) -> bytes:
        """Return the configured payload."""
        return self._data


class _FakeStore:
    """Object-store double recording puts/deletes and serving a fixed listing."""

    def __init__(self, objects: list[ObjectInfo] | None = None, fail_delete: set[str] | None = None) -> None:
        self.puts: list[str] = []
        self.deletes: list[str] = []
        self._objects = objects or []
        self._fail_delete = fail_delete or set()

    async def put(self, key: str, _data: bytes, metadata: dict[str, str] | None = None) -> None:
        """Record a stored key."""
        self.puts.append(key)

    async def list(self, _prefix: str = "") -> list[ObjectInfo]:
        """Return the fixed object listing."""
        return self._objects

    async def delete(self, key: str) -> None:
        """Record a delete (or raise if configured to fail)."""
        if key in self._fail_delete:
            raise ObjectNotFoundError(key)
        self.deletes.append(key)


def _patch_store(monkeypatch: pytest.MonkeyPatch, store: _FakeStore, *, existing: list[Any] | None = None) -> None:
    """Wire the fake store and an empty/overridden asset listing into the service."""
    monkeypatch.setattr(asset_service, "get_object_store", lambda: store)

    async def _list(_prefix: str = "") -> list[Any]:
        return existing or []

    monkeypatch.setattr(asset_service, "list_assets", _list)


async def test_upload_rejects_unsupported_content_type() -> None:
    """An unknown content type is rejected before reading the body."""
    with pytest.raises(InvalidImageTypeError):
        await upload_asset(_FakeUpload("application/pdf", "x.pdf", b"x"))


async def test_upload_rejects_too_large_payload() -> None:
    """A payload over the 5 MB limit is rejected."""
    big = b"0" * (5 * 1024 * 1024 + 1)
    with pytest.raises(ImageTooLargeError):
        await upload_asset(_FakeUpload("image/png", "big.png", big))


async def test_upload_rejects_duplicate_name(monkeypatch: pytest.MonkeyPatch) -> None:
    """A duplicate filename in the same folder is rejected."""
    from types import SimpleNamespace

    _patch_store(monkeypatch, _FakeStore(), existing=[SimpleNamespace(name="dup.png")])

    with pytest.raises(AssetNameConflictError):
        await upload_asset(_FakeUpload("image/png", "dup.png", _png_bytes()))


async def test_upload_rejects_duplicate_name_among_many_existing(monkeypatch: pytest.MonkeyPatch) -> None:
    """A single matching name among several existing assets triggers the conflict."""
    from types import SimpleNamespace

    existing = [SimpleNamespace(name="other.png"), SimpleNamespace(name="dup.png")]
    _patch_store(monkeypatch, _FakeStore(), existing=existing)

    with pytest.raises(AssetNameConflictError):
        await upload_asset(_FakeUpload("image/png", "dup.png", _png_bytes()))


async def test_upload_svg_stores_master_without_variants(monkeypatch: pytest.MonkeyPatch) -> None:
    """An SVG upload yields a single master key and no webp variants."""
    store = _FakeStore()
    _patch_store(monkeypatch, store)

    result = await upload_asset(_FakeUpload("image/svg+xml", "logo.svg", b"<svg/>"))

    assert result.key.endswith(".svg")
    assert result.webpKeys is None
    assert store.puts == [result.key]


async def test_upload_png_stores_master_and_webp_variants(monkeypatch: pytest.MonkeyPatch) -> None:
    """A PNG upload stores the master plus a ratio→width webp key grid."""
    store = _FakeStore()
    _patch_store(monkeypatch, store)

    result = await upload_asset(_FakeUpload("image/png", "pic.png", _png_bytes()))

    assert result.key.endswith(".png")
    assert store.puts[0] == result.key
    assert result.webpKeys is not None
    assert set(result.webpKeys) == {"16-9", "21-9", "4-3"}
    assert all(key.endswith(".webp") for key in store.puts[1:])


async def test_delete_asset_removes_master_and_variants(monkeypatch: pytest.MonkeyPatch) -> None:
    """Deleting an asset also removes its derived WebP variants."""
    objects = [_info("p/abc.png"), _info("p/abc.800.webp"), _info("p/other.png")]
    store = _FakeStore(objects=objects)
    monkeypatch.setattr(asset_service, "get_object_store", lambda: store)

    await delete_asset("p/abc.png")

    assert store.deletes[0] == "p/abc.png"
    assert "p/abc.800.webp" in store.deletes
    assert "p/other.png" not in store.deletes


async def test_delete_asset_ignores_missing_variant(monkeypatch: pytest.MonkeyPatch) -> None:
    """A variant that is already gone is ignored."""
    objects = [_info("p/abc.png"), _info("p/abc.800.webp")]
    store = _FakeStore(objects=objects, fail_delete={"p/abc.800.webp"})
    monkeypatch.setattr(asset_service, "get_object_store", lambda: store)

    await delete_asset("p/abc.png")

    assert store.deletes == ["p/abc.png"]


async def test_delete_asset_without_folder_uses_bare_stem_prefix(monkeypatch: pytest.MonkeyPatch) -> None:
    """A root-level key has no './' prefix, so its variant is still cascaded."""
    objects = [_info("abc.png"), _info("abc.800.webp")]
    store = _FakeStore(objects=objects)
    monkeypatch.setattr(asset_service, "get_object_store", lambda: store)

    await delete_asset("abc.png")

    assert store.deletes == ["abc.png", "abc.800.webp"]
