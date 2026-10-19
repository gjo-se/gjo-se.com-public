"""Unit tests for scraper_status module (in-memory progress tracker)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.fbf.infrastructure import scraper_status_client as scraper_status
from app.fbf.infrastructure.scraper_status_client import ScraperStatus

pytestmark = pytest.mark.xdist_group(name="scraper_status")


@pytest.fixture(autouse=True)
def _isolated_status_file(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Point the status file at a per-test path so tests never share state."""
    monkeypatch.setenv("SCRAPER_STATUS_FILE", str(tmp_path / "status.json"))


def test_default_status_is_idle_with_zeroed_counters() -> None:
    """A fresh status is idle, not running, with every counter zeroed."""
    status = ScraperStatus()

    assert status.running is False
    assert status.abort_requested is False
    assert status.phase == "idle"
    assert status.started_at == 0.0
    assert status.scraper_role == ""
    assert status.scraper_roles_total == 0
    assert status.scraper_roles_done == 0
    assert status.scraper_page == 0
    assert status.scraper_pages_total == 0
    assert status.scraper_saved == 0
    assert status.mapper_total == 0
    assert status.mapper_processed == 0
    assert status.mapper_new == 0
    assert status.mapper_duplicates == 0
    assert status.mapper_url_matches == 0
    assert status.mapper_errors == 0
    assert status.stats is None
    assert status.error == ""


def test_load_ignores_corrupt_file_and_unknown_keys() -> None:
    """A corrupt file falls back to idle; unknown keys are filtered out."""
    status_file = Path(scraper_status._status_file())

    status_file.write_text("{ not json", encoding="utf-8")
    assert scraper_status.get_status().phase == "idle"

    status_file.write_text(json.dumps({"phase": "mapping", "bogus": 1}), encoding="utf-8")
    assert scraper_status.get_status().phase == "mapping"


def test_to_dict_includes_all_fields() -> None:
    """to_dict returns a dict with all expected keys."""
    scraper_status.reset_status()
    scraper_status.finish_run({"new_projects": 5, "duplicates": 2})

    result = scraper_status.get_status().to_dict()
    assert result["phase"] == "done"
    assert result["running"] is False
    assert result["stats"] == {"new_projects": 5, "duplicates": 2}


def test_update_scraper_sets_fields() -> None:
    """update_scraper updates partial scraper progress fields."""
    scraper_status.reset_status()
    scraper_status.start_run()
    scraper_status.update_scraper(role="Python", roles_total=5, roles_done=2, page=3, pages_total=8, saved=42)

    status = scraper_status.get_status()
    assert status.phase == "scraping"
    assert status.scraper_role == "Python"
    assert status.scraper_roles_total == 5
    assert status.scraper_roles_done == 2
    assert status.scraper_page == 3
    assert status.scraper_pages_total == 8
    assert status.scraper_saved == 42


def test_start_mapping_resets_mapper_fields() -> None:
    """start_mapping sets phase to mapping and resets counters."""
    scraper_status.reset_status()
    scraper_status.start_run()
    scraper_status.start_mapping(100)

    status = scraper_status.get_status()
    assert status.phase == "mapping"
    assert status.mapper_total == 100
    assert status.mapper_processed == 0
    assert status.mapper_new == 0
    assert status.mapper_duplicates == 0
    assert status.mapper_url_matches == 0
    assert status.mapper_errors == 0


def test_update_mapping_tracks_progress() -> None:
    """update_mapping updates mapper counters."""
    scraper_status.reset_status()
    scraper_status.start_run()
    scraper_status.start_mapping(100)
    scraper_status.update_mapping(processed=50, new=10, duplicates=3, url_matches=5, errors=2)

    status = scraper_status.get_status()
    assert status.mapper_processed == 50
    assert status.mapper_new == 10
    assert status.mapper_duplicates == 3
    assert status.mapper_url_matches == 5
    assert status.mapper_errors == 2


def test_finish_run_sets_done() -> None:
    """finish_run sets phase to done and stores stats."""
    scraper_status.reset_status()
    scraper_status.start_run()
    scraper_status.finish_run({"result": "ok"})

    status = scraper_status.get_status()
    assert status.phase == "done"
    assert status.running is False
    assert status.stats == {"result": "ok"}


def test_fail_run_sets_error() -> None:
    """fail_run sets phase to error with message."""
    scraper_status.reset_status()
    scraper_status.start_run()
    scraper_status.fail_run("Something broke")

    status = scraper_status.get_status()
    assert status.phase == "error"
    assert status.running is False
    assert status.error == "Something broke"


def test_get_status_clears_stale_state(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    """get_status resets state when TTL has expired."""
    import time as time_module

    scraper_status.reset_status()
    scraper_status.start_run()

    # Simulate TTL expired by patching time.time
    real_time = time_module.time

    def fake_time() -> float:
        return real_time() + 9999

    monkeypatch.setattr(time_module, "time", fake_time)
    status = scraper_status.get_status()
    assert status.phase == "idle"
    assert status.running is False


def test_abort_request_stops_run() -> None:
    """request_abort signal is readable via is_aborted."""
    scraper_status.reset_status()
    scraper_status.start_run()

    assert scraper_status.is_aborted() is False
    scraper_status.request_abort()
    assert scraper_status.is_aborted() is True


def test_start_mapping_clears_leaked_abort_flag() -> None:
    """Entering the mapping phase clears a leaked abort flag."""
    scraper_status.reset_status()
    scraper_status.start_run()
    scraper_status.request_abort()

    scraper_status.start_mapping(10)

    assert scraper_status.is_aborted() is False


def test_get_status_keeps_running_without_started_at(monkeypatch: pytest.MonkeyPatch) -> None:
    """A running status with a zero started_at is never treated as stale."""
    import time as time_module

    scraper_status._save(ScraperStatus(running=True, started_at=0.0))
    monkeypatch.setattr(time_module, "time", lambda: 1_000_000.0)

    assert scraper_status.get_status().running is True
