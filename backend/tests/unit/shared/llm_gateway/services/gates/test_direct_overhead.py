"""Unit tests for the gate 1c direct-overhead result assembly."""

from __future__ import annotations

from typing import Any

import pytest

from app.shared.llm_gateway.services.gates import direct_overhead as svc
from app.shared.llm_gateway.services.gates.base import GATE_1C_DIRECT_OVERHEAD_THRESHOLD
from app.shared.llm_gateway.services.gates.direct_overhead import (
    _build_direct_overhead_result,
    _run_direct_call,
)


@pytest.mark.unit
def test_direct_overhead_result_passes_when_client_is_within_threshold() -> None:
    """A client running at most 2x the direct latency passes gate 1c."""
    result = _build_direct_overhead_result([100, 100, 100], [150, 150, 150])

    assert result["status"] == "passed"


@pytest.mark.unit
def test_direct_overhead_result_fails_when_client_exceeds_threshold() -> None:
    """A client well above 2x the direct latency fails gate 1c."""
    result = _build_direct_overhead_result([100, 100, 100], [300, 300, 300])

    assert result["status"] == "failed"


@pytest.mark.unit
def test_direct_overhead_result_reports_overhead_ratio() -> None:
    """The reported overhead ratio equals avg_client / avg_direct."""
    result = _build_direct_overhead_result([100, 100], [250, 250])

    assert result["overhead_ratio"] == 2.5


@pytest.mark.unit
def test_direct_overhead_score_is_capped_at_one_when_client_faster() -> None:
    """A client faster than direct (ratio < 1) caps the score at 1.0."""
    result = _build_direct_overhead_result([100, 100], [50, 50])
    assert result["overhead_ratio"] == 0.5
    assert result["score"] == 1.0


@pytest.mark.unit
def test_direct_overhead_score_is_inverse_ratio() -> None:
    """A slow client yields score = 1 / overhead_ratio."""
    result = _build_direct_overhead_result([100, 100], [400, 400])
    assert result["overhead_ratio"] == 4.0
    assert result["score"] == 0.25


@pytest.mark.unit
def test_direct_overhead_reports_averages_and_sample_count() -> None:
    """Averages, sample count and threshold are reported verbatim."""
    result = _build_direct_overhead_result([100, 300], [200, 400])
    assert result["samples"] == 2
    assert result["avg_direct_ms"] == 200.0
    assert result["avg_client_ms"] == 300.0
    assert result["threshold"] == GATE_1C_DIRECT_OVERHEAD_THRESHOLD


@pytest.mark.unit
async def test_run_direct_call_measures_elapsed_milliseconds(monkeypatch: pytest.MonkeyPatch) -> None:
    """The elapsed duration is the monotonic delta scaled to whole milliseconds."""
    counter = {"n": 0}

    def _mono() -> float:
        counter["n"] += 1
        return 0.0 if counter["n"] == 1 else 0.25

    async def _call(**_kw: Any) -> None:
        return None

    class _Client:
        call = staticmethod(_call)

    monkeypatch.setattr(
        "app.shared.llm_gateway.dependencies.llm_gateway_dependencies.get_direct_client",
        _Client,
    )
    monkeypatch.setattr(svc.time, "monotonic", _mono)

    elapsed = await _run_direct_call(
        {"model_identifier": "m", "api_key": "k", "portal": "p", "api_base": "b"},
        [{"role": "user", "content": "hi"}],
    )
    assert elapsed == 250
