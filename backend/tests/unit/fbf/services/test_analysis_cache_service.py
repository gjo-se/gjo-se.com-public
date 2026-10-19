"""Unit tests for the analysis cache (single JSON file on disk).

Uses a tmp cache path via monkeypatch so no real ``data/analysis_cache.json``
is touched. The file system is the system boundary here – the service has no DB
or network dependency.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.fbf.services import analysis_cache_service

pytestmark = pytest.mark.unit


@pytest.fixture()
def cache_paths(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Path:
    """Redirect the module-level cache path into a tmp directory."""
    cache_file = tmp_path / "analysis_cache.json"
    monkeypatch.setattr(analysis_cache_service, "CACHE_DIR", tmp_path)
    monkeypatch.setattr(analysis_cache_service, "CACHE_FILE", cache_file)
    return cache_file


def test_read_cache_returns_none_when_file_missing(cache_paths: Path) -> None:
    """A missing cache file yields ``None`` instead of raising."""
    assert analysis_cache_service.read_cache() is None


def test_write_then_read_cache_roundtrips_computed_payload(cache_paths: Path) -> None:
    """A written payload with ``computed_at`` reads back identically."""
    payload = {"computed_at": "2026-01-01T00:00:00Z", "impact": [1, 2, 3]}

    analysis_cache_service.write_cache(payload)

    assert analysis_cache_service.read_cache() == payload


def test_read_cache_returns_none_when_json_is_invalid(cache_paths: Path) -> None:
    """Malformed JSON degrades to ``None`` (cache is best-effort)."""
    cache_paths.write_text("{not valid json", encoding="utf-8")

    assert analysis_cache_service.read_cache() is None


def test_read_cache_returns_none_when_computed_at_missing(cache_paths: Path) -> None:
    """A dict without ``computed_at`` is treated as an invalid cache."""
    cache_paths.write_text(json.dumps({"impact": [1]}), encoding="utf-8")

    assert analysis_cache_service.read_cache() is None
