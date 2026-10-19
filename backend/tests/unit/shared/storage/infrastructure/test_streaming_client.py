"""Unit tests for the object-store streaming content-type mapping and streaming."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

import pytest

from app.shared.storage.domain.base_contract import ObjectNotFoundError
from app.shared.storage.infrastructure import streaming_client
from app.shared.storage.infrastructure.streaming_client import content_type_for, stream_object

pytestmark = pytest.mark.unit


@pytest.mark.parametrize(
    ("key", "expected"),
    [
        ("a.svg", "image/svg+xml"),
        ("a.webp", "image/webp"),
        ("a.png", "image/png"),
        ("a.jpeg", "image/jpeg"),
        ("a.jpg", "image/jpeg"),
        ("a.txt", "application/octet-stream"),
        ("no-extension", "application/octet-stream"),
    ],
)
def test_content_type_for_maps_extension(key: str, expected: str) -> None:
    """Known image extensions map to their media type, everything else falls back."""
    assert content_type_for(key) == expected


def _patch_store(monkeypatch: pytest.MonkeyPatch, *, exists: bool, url: str = "http://store/obj") -> None:
    """Patch the object-store factory with a deterministic fake store."""
    store = SimpleNamespace(exists=AsyncMock(return_value=exists), get_url=AsyncMock(return_value=url))
    monkeypatch.setattr(streaming_client, "get_object_store", lambda: store)


async def test_stream_object_raises_when_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    """A missing object raises ObjectNotFoundError instead of streaming an empty body."""
    _patch_store(monkeypatch, exists=False)

    with pytest.raises(ObjectNotFoundError):
        await stream_object("proofs/missing.webp")


def _patch_http_client(monkeypatch: pytest.MonkeyPatch, recorded: dict[str, Any]) -> None:
    """Patch httpx.AsyncClient with a streaming fake that records call parameters."""

    class _Response:
        def raise_for_status(self) -> None:
            return None

        async def aiter_bytes(self, chunk_size: int) -> Any:
            recorded["chunk_size"] = chunk_size
            for chunk in (b"aa", b"bb"):
                yield chunk

    class _StreamCtx:
        async def __aenter__(self) -> _Response:
            return _Response()

        async def __aexit__(self, *_exc: object) -> bool:
            return False

    class _Client:
        def __init__(self, **kwargs: Any) -> None:
            recorded.update(kwargs)

        async def __aenter__(self) -> _Client:
            return self

        async def __aexit__(self, *_exc: object) -> bool:
            return False

        def stream(self, method: str, url: str) -> _StreamCtx:
            recorded["method"] = method
            recorded["url"] = url
            return _StreamCtx()

    monkeypatch.setattr(streaming_client.httpx, "AsyncClient", _Client)


async def test_stream_object_streams_chunks_with_timeout_and_chunk_size(monkeypatch: pytest.MonkeyPatch) -> None:
    """The stream yields every chunk, fetching with a 30 s timeout and 64 KiB chunks."""
    recorded: dict[str, Any] = {}
    _patch_store(monkeypatch, exists=True)
    _patch_http_client(monkeypatch, recorded)

    response = await stream_object("proofs/hero.webp")

    chunks = [chunk async for chunk in response.body_iterator]

    assert chunks == [b"aa", b"bb"]
    assert recorded["timeout"] == 30.0
    assert recorded["chunk_size"] == 65536
    assert recorded["method"] == "GET"
    assert recorded["url"] == "http://store/obj"
    assert response.media_type == "image/webp"
