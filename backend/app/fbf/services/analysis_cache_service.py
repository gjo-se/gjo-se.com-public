"""Read/write the analysis cache (single JSON file on disk).

The cache is a plain JSON file that holds pre-computed Impact, Swing,
Delta, and Trend data.  It is written by ``POST /analysis/refresh`` and
read by the chart GET endpoints.  When the file is missing or unreadable,
the endpoints fall back to live computation.

The cache lives in the configured runtime cache directory
(``settings.ANALYSIS_CACHE_DIR``, default ``.cache/fbf`` relative to the
process working directory) – never in the repository root.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import structlog

from app.shared.config.config import settings

logger = structlog.get_logger(__name__)

CACHE_DIR = Path(settings.ANALYSIS_CACHE_DIR).expanduser().resolve()
CACHE_FILE = CACHE_DIR / "analysis_cache.json"


def read_cache() -> dict[str, Any] | None:
    """Return the cached analysis data or ``None`` on any failure."""
    try:
        if not CACHE_FILE.exists():
            return None
        with CACHE_FILE.open(encoding="utf-8") as fh:
            data = json.load(fh)
        if isinstance(data, dict) and "computed_at" in data:
            return data
        logger.warning("Cache file invalid – missing computed_at.")
        return None
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("Failed to read analysis cache: %s", exc)
        return None


def write_cache(data: dict[str, Any]) -> None:
    """Persist the analysis data as JSON."""
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        with CACHE_FILE.open("w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, default=str, indent=2)
        logger.info("Analysis cache written (%d bytes).", CACHE_FILE.stat().st_size)
    except OSError as exc:
        logger.error("Failed to write analysis cache: %s", exc)
