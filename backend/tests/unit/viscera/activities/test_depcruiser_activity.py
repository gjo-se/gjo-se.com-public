"""Unit tests for the dependency-cruiser activity.

The subprocess and the architecture root are replaced by deterministic doubles,
so the JSON-pass-through, persistence and error mapping are verified without
Node.js.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from app.viscera.activities import depcruiser_activity
from app.viscera.activities.depcruiser_activity import run

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


@pytest.fixture()
def arch_root(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Redirect the architecture root to a per-test tmp folder."""
    monkeypatch.setattr(depcruiser_activity.ArchitectureStore, "root", lambda self: tmp_path)
    return tmp_path


def _install_subprocess(monkeypatch: pytest.MonkeyPatch, *, returncode: int, stdout: str, stderr: str = "") -> None:
    """Patch ``subprocess.run`` to return a canned CompletedProcess."""

    def _fake(*_args: object, **_kwargs: object) -> subprocess.CompletedProcess[str]:
        return subprocess.CompletedProcess(args=[], returncode=returncode, stdout=stdout, stderr=stderr)

    monkeypatch.setattr(depcruiser_activity.subprocess, "run", _fake)


async def test_run_persists_frontend_json_on_success(monkeypatch: pytest.MonkeyPatch, arch_root: Path) -> None:
    """A successful run returns the modules and writes ``imports/frontend.json``."""
    payload = {"modules": [{"source": "a.ts", "dependencies": []}]}
    _install_subprocess(monkeypatch, returncode=0, stdout=json.dumps(payload))

    result = await run(MagicMock(), {})

    assert result == {"ok": True, "frontend": payload}
    written = json.loads((arch_root / "_pipeline" / "imports" / "frontend.json").read_text(encoding="utf-8"))
    assert written == {"frontend": payload}


async def test_run_reports_error_on_nonzero_exit(monkeypatch: pytest.MonkeyPatch, arch_root: Path) -> None:
    """A non-zero exit code yields ``ok: False`` with the stderr message."""
    _install_subprocess(monkeypatch, returncode=2, stdout="", stderr="boom")

    result = await run(MagicMock(), {})

    assert result == {"ok": False, "error": "boom"}


async def test_run_reports_error_on_invalid_json(monkeypatch: pytest.MonkeyPatch, arch_root: Path) -> None:
    """Non-JSON stdout yields ``ok: False``."""
    _install_subprocess(monkeypatch, returncode=0, stdout="not-json")

    result = await run(MagicMock(), {})

    assert result["ok"] is False
    assert "Invalid JSON" in result["error"]
