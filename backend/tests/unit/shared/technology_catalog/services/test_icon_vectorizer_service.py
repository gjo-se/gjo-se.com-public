"""Unit tests for the PNG→SVG icon vectorizer."""

from __future__ import annotations

from typing import cast

import pytest
import vtracer

from app.shared.storage.domain.base_contract import ObjectStore
from app.shared.technology_catalog.services.icon_vectorizer_service import vectorize_icon

pytestmark = pytest.mark.unit


class _FakeStore:
    """Minimal ObjectStore double recording stored objects."""

    def __init__(self) -> None:
        self.stored: dict[str, bytes] = {}

    async def put(self, key: str, data: bytes, *, metadata: dict[str, str] | None = None) -> str:
        """Record the stored bytes under the key."""
        self.stored[key] = data
        return key


async def test_vectorize_icon_stores_svg_when_conversion_succeeds(monkeypatch: pytest.MonkeyPatch) -> None:
    """A successful conversion persists the SVG bytes and returns them."""
    store = _FakeStore()
    monkeypatch.setattr(vtracer, "convert_raw_image_to_svg", lambda *_args, **_kwargs: "<svg/>")

    result = await vectorize_icon(b"png-bytes", "icons/x.svg", cast(ObjectStore, store))

    assert result == b"<svg/>"
    assert store.stored["icons/x.svg"] == b"<svg/>"


async def test_vectorize_icon_returns_none_when_conversion_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    """A failing conversion yields None and stores nothing."""
    store = _FakeStore()

    def _boom(*_args: object, **_kwargs: object) -> str:
        raise RuntimeError("vtracer failed")

    monkeypatch.setattr(vtracer, "convert_raw_image_to_svg", _boom)

    result = await vectorize_icon(b"png-bytes", "icons/x.svg", cast(ObjectStore, store))

    assert result is None
    assert store.stored == {}
