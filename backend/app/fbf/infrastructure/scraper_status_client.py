"""Shared status tracker for scraper/mapper progress.

The dev backend runs under ``uvicorn --workers N`` (multiple processes), so an
in-memory module singleton is only visible to ONE worker: the background scraper
would update worker A, while ``GET /scraper/status`` round-robins and often hits
worker B → the UI froze. To keep the status visible across all workers of the
same container, it is persisted to a small JSON file on the shared container
filesystem (atomic tmp+rename writes). Every update is a full-state write;
reads load the latest state.

prod does NOT use this store: the always-on API dispatches the scraper to the
isolated Fargate job and reports job/DB status there. This module
covers the local in-process dev path.

The path can be overridden via ``SCRAPER_STATUS_FILE`` (tests / isolated envs).
"""

from __future__ import annotations

import json
import os
import tempfile
import time
from dataclasses import asdict, dataclass, fields
from pathlib import Path
from typing import Any

_DEFAULT_TTL = 300  # clear stale status after 5 minutes
#: Portable temp location – never hardcode ``/tmp`` (CWE-377); the shared
#: container filesystem is what matters, not a specific directory.
_DEFAULT_FILE = str(Path(tempfile.gettempdir()) / "gjose_scraper_status.json")


@dataclass
class ScraperStatus:
    """Live progress of a scraper+mapper run."""

    running: bool = False
    phase: str = "idle"  # idle | scraping | mapping | done | error
    started_at: float = 0.0

    # Scraper progress
    scraper_role: str = ""
    scraper_roles_total: int = 0
    scraper_roles_done: int = 0
    scraper_page: int = 0
    scraper_pages_total: int = 0
    scraper_saved: int = 0

    # Mapper progress
    mapper_total: int = 0
    mapper_processed: int = 0
    mapper_new: int = 0
    mapper_duplicates: int = 0
    mapper_url_matches: int = 0
    mapper_errors: int = 0

    # Final stats (from mapper return dict)
    stats: dict[str, Any] | None = None

    # Error info
    error: str = ""

    # Abort flag – checked by scraper/mapper loops
    abort_requested: bool = False

    def to_dict(self) -> dict[str, object]:
        """Serialise to dict for JSON response."""
        return asdict(self)


def _status_file() -> Path:
    """Return the status file path (env-overridable, lazily resolved)."""
    return Path(os.environ.get("SCRAPER_STATUS_FILE", _DEFAULT_FILE))


def _load() -> ScraperStatus:
    """Load the latest status from the shared file (idle if absent/corrupt)."""
    try:
        raw = _status_file().read_text(encoding="utf-8")
        data = json.loads(raw)
        valid_keys = {f.name for f in fields(ScraperStatus)}
        clean = {k: v for k, v in data.items() if k in valid_keys}
        return ScraperStatus(**clean)
    except (OSError, ValueError, TypeError):
        return ScraperStatus()


def _save(status: ScraperStatus) -> None:  # pragma: no cover
    """Persist status atomically (tmp file + rename) to avoid torn reads."""
    path = _status_file()
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(asdict(status)), encoding="utf-8")
        os.replace(tmp, path)
    except OSError:
        # Non-fatal: status tracking must never break the scraper run.
        pass


def get_status() -> ScraperStatus:
    """Return the current status, clearing stale state if needed."""
    current = _load()
    if current.running and current.started_at > 0 and time.time() - current.started_at > _DEFAULT_TTL:
        reset_status()
        current = _load()
    return current


def reset_status() -> None:
    """Reset to idle."""
    _save(ScraperStatus())


def start_run() -> None:
    """Mark a new run as started."""
    _save(ScraperStatus(running=True, phase="scraping", started_at=time.time()))


def update_scraper(
    *,
    role: str = "",
    roles_total: int = 0,
    roles_done: int = 0,
    page: int = 0,
    pages_total: int = 0,
    saved: int = 0,
) -> None:
    """Update scraper progress counters."""
    current = _load()
    current.phase = "scraping"
    if role:
        current.scraper_role = role
    if roles_total:
        current.scraper_roles_total = roles_total
    if roles_done:
        current.scraper_roles_done = roles_done
    if page:
        current.scraper_page = page
    if pages_total:
        current.scraper_pages_total = pages_total
    if saved:
        current.scraper_saved = saved
    _save(current)


def start_mapping(total: int) -> None:
    """Transition to mapping phase with initial total.

    Clears a stale ``abort_requested`` flag: the mapper only runs when the
    preceding scrape phase was *not* aborted (see ``run_unified_scraper``),
    so entering the mapping phase is always a fresh run. Without this reset a
    leaked abort flag (e.g. from a prior run or a shared status file) would
    abort the mapping loop immediately.
    """
    current = _load()
    current.phase = "mapping"
    current.abort_requested = False
    current.mapper_total = total
    current.mapper_processed = 0
    current.mapper_new = 0
    current.mapper_duplicates = 0
    current.mapper_url_matches = 0
    current.mapper_errors = 0
    _save(current)


def update_mapping(
    *,
    processed: int,
    new: int,
    duplicates: int,
    url_matches: int,
    errors: int,
) -> None:
    """Update mapper progress counters."""
    current = _load()
    current.mapper_processed = processed
    current.mapper_new = new
    current.mapper_duplicates = duplicates
    current.mapper_url_matches = url_matches
    current.mapper_errors = errors
    _save(current)


def finish_run(stats: dict[str, Any]) -> None:
    """Mark run as completed and store final stats."""
    current = _load()
    current.phase = "done"
    current.running = False
    current.stats = stats
    _save(current)


def fail_run(error: str) -> None:
    """Mark run as failed with error message."""
    current = _load()
    current.phase = "error"
    current.running = False
    current.error = error
    _save(current)


def request_abort() -> None:
    """Signal the running scraper/mapper to stop at the next check point."""
    current = _load()
    current.abort_requested = True
    _save(current)


def is_aborted() -> bool:
    """Check if abort was requested – call in scraper/mapper loops."""
    return _load().abort_requested
