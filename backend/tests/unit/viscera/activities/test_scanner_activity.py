"""Unit tests for the SQLAlchemy scanner activity.

The scanner engine is replaced by a deterministic double – the activity's
behaviour (summary pass-through, error containment) is verified without running
a real scan.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.viscera.activities import scanner_activity
from app.viscera.activities.scanner_activity import run

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


async def test_run_returns_scanner_summary_on_success(monkeypatch: pytest.MonkeyPatch) -> None:
    """The scanner summary is returned verbatim on success."""
    monkeypatch.setattr(scanner_activity, "run_scanner", lambda: {"ok": True, "tables": {"app": 3}})

    result = await run(MagicMock(), {})

    assert result == {"ok": True, "tables": {"app": 3}}


async def test_run_contains_scanner_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """A scanner exception becomes ``ok: False`` with the error message."""

    def _boom() -> dict:
        raise RuntimeError("scanner down")

    monkeypatch.setattr(scanner_activity, "run_scanner", _boom)

    result = await run(MagicMock(), {})

    assert result["ok"] is False
    assert "scanner down" in result["error"]
