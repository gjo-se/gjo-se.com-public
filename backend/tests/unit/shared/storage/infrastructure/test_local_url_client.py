"""Unit tests for the LocalUrlMixin (local object-store URL building)."""

from __future__ import annotations

import pytest

from app.shared.storage.infrastructure.local_url_client import LocalUrlMixin

pytestmark = pytest.mark.unit


class _Store(LocalUrlMixin):
    """Minimal concrete store exposing the mixin's expected attribute."""

    def __init__(self, base_url: str) -> None:
        self._base_url = base_url.rstrip("/")


async def test_get_url_joins_base_url_and_key() -> None:
    """get_url builds ``{base_url}/{key}`` including path segments."""
    store = _Store("http://localhost:9000/assets")

    assert await store.get_url("profile/abc.jpg") == "http://localhost:9000/assets/profile/abc.jpg"


async def test_get_url_strips_trailing_slash_in_base() -> None:
    """A trailing slash in the base URL does not produce a double slash."""
    store = _Store("http://localhost:9000/assets/")

    assert await store.get_url("a.png") == "http://localhost:9000/assets/a.png"
