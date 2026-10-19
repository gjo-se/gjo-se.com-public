"""Unit tests for the pydeps activity.

The subprocess, the pydeps mapper and the architecture root are replaced by
deterministic doubles, so the persistence and error mapping are verified
without running pydeps.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from app.viscera.activities import pydeps_activity
from app.viscera.activities.pydeps_activity import run

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


@pytest.fixture()
def arch_root(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Redirect the architecture root to a per-test tmp folder."""
    monkeypatch.setattr(pydeps_activity.ArchitectureStore, "root", lambda self: tmp_path)
    return tmp_path


def _install_subprocess(monkeypatch: pytest.MonkeyPatch, *, returncode: int, stdout: str, stderr: str = "") -> None:
    """Patch ``subprocess.run`` to return a canned CompletedProcess."""

    def _fake(*_args: object, **_kwargs: object) -> subprocess.CompletedProcess[str]:
        return subprocess.CompletedProcess(args=[], returncode=returncode, stdout=stdout, stderr=stderr)

    monkeypatch.setattr(pydeps_activity.subprocess, "run", _fake)


async def test_run_persists_canonical_modules_on_success(monkeypatch: pytest.MonkeyPatch, arch_root: Path) -> None:
    """A successful run persists the mapped modules and reports the count."""
    modules = [{"name": "app.a", "path": "app/a.py", "imports": [], "top_level": "app"}]
    _install_subprocess(monkeypatch, returncode=0, stdout="{}")
    monkeypatch.setattr(pydeps_activity, "map_pydeps_output", lambda _raw: modules)

    result = await run(MagicMock(), {})

    assert result == {"ok": True, "modules_found": 1}
    written = json.loads((arch_root / "_pipeline" / "imports" / "backend.json").read_text(encoding="utf-8"))
    assert written == {"backend": {"modules": modules}}


async def test_run_reports_error_on_nonzero_exit(monkeypatch: pytest.MonkeyPatch, arch_root: Path) -> None:
    """A non-zero exit code yields ``ok: False`` with the stderr message."""
    _install_subprocess(monkeypatch, returncode=1, stdout="", stderr="pydeps failed")

    result = await run(MagicMock(), {})

    assert result == {"ok": False, "error": "pydeps failed"}
