"""Unit tests for the eval-runner CLI argument handling."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from app.shared.llm_gateway.services.eval_runner_service import _async_main, _parse_args, main


@pytest.mark.unit
def test_parse_args_defaults_trigger_to_manual() -> None:
    """The trigger defaults to 'manual' when not provided."""
    args = _parse_args(["--task", "description-merge"])

    assert args.task == "description-merge"
    assert args.trigger == "manual"


@pytest.mark.unit
def test_parse_args_accepts_an_explicit_trigger() -> None:
    """An explicit trigger overrides the manual default."""
    args = _parse_args(["--task", "description-merge", "--trigger", "scheduled"])

    assert args.trigger == "scheduled"


@pytest.mark.unit
def test_main_reports_usage_error_for_unknown_task(capsys: pytest.CaptureFixture[str]) -> None:
    """An unknown task key exits with code 2 and lists the valid tasks."""
    exit_code = main(["--task", "does-not-exist"])

    captured = capsys.readouterr()
    assert exit_code == 2
    assert "Unknown task" in captured.err


@pytest.mark.unit
def test_main_requires_the_task_argument() -> None:
    """Omitting --task is a usage error handled by argparse."""
    with pytest.raises(SystemExit):
        main([])


# ── _async_main: Exit-Code + JSON-Ausgabe ─────────────────────────────────────


class _FakeSessionCtx:
    async def __aenter__(self) -> object:
        return object()

    async def __aexit__(self, *_exc: object) -> bool:
        return False


class _Run:
    def __init__(self, overall_status: str, created_at: datetime | None = None) -> None:
        self.id = 1
        self.task = "description-merge"
        self.model_config_id = None
        self.trigger = "manual"
        self.overall_status = overall_status
        self.gate_results: list[object] = []
        self.created_at = created_at


class _EvalService:
    def __init__(self, runs: list[_Run]) -> None:
        self._runs = runs

    async def run_gates(self, _db: object, _task_key: str, _trigger: str) -> list[_Run]:
        return self._runs


def _patch_service(monkeypatch: pytest.MonkeyPatch, runs: list[_Run]) -> None:
    monkeypatch.setattr(
        "app.shared.llm_gateway.repositories.eval_run_repository.open_session",
        _FakeSessionCtx,
    )
    monkeypatch.setattr(
        "app.shared.llm_gateway.dependencies.llm_gateway_dependencies.get_evaluation_service",
        lambda: _EvalService(runs),
    )


@pytest.mark.unit
@pytest.mark.asyncio
async def test_async_main_returns_zero_and_prints_json_when_all_passed(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    """All candidates passed → exit 0 and the results are printed as JSON (indent 2)."""
    _patch_service(monkeypatch, [_Run("passed")])

    exit_code = await _async_main("description-merge", "manual")

    out = capsys.readouterr().out
    assert exit_code == 0
    assert '"overall_status": "passed"' in out
    assert '\n    "id": 1' in out  # json.dumps(..., indent=2)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_async_main_returns_one_when_any_run_not_passed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A single non-passed candidate makes the whole run exit 1."""
    _patch_service(monkeypatch, [_Run("passed"), _Run("failed")])

    assert await _async_main("description-merge", "manual") == 1


@pytest.mark.unit
@pytest.mark.asyncio
async def test_async_main_returns_zero_without_runs(monkeypatch: pytest.MonkeyPatch) -> None:
    """No candidates → nothing to fail → exit 0."""
    _patch_service(monkeypatch, [])

    assert await _async_main("description-merge", "manual") == 0


@pytest.mark.unit
@pytest.mark.asyncio
async def test_async_main_serializes_created_at_or_null(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    """A set ``created_at`` is ISO-formatted; a ``None`` becomes JSON ``null``."""
    now = datetime(2020, 1, 2, 3, 4, 5, tzinfo=UTC)
    _patch_service(monkeypatch, [_Run("passed", now), _Run("passed", None)])

    await _async_main("description-merge", "manual")

    out = capsys.readouterr().out
    assert f'"created_at": "{now.isoformat()}"' in out
    assert '"created_at": null' in out
