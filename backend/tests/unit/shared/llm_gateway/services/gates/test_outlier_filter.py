"""Unit tests for IQR outlier filtering."""

from __future__ import annotations

import pytest

from app.shared.llm_gateway.services.gates.outlier_filter import _remove_outliers_iqr

pytestmark = pytest.mark.unit


class _Analyzer:
    """Fake stability analyzer returning fixed Q1/Q3 percentiles."""

    def __init__(self, q1: float, q3: float) -> None:
        self.q1 = q1
        self.q3 = q3
        self.calls: list[int] = []

    def percentile(self, _values: list[float], p: int) -> float:
        self.calls.append(p)
        return self.q1 if p == 25 else self.q3


def _patch(monkeypatch: pytest.MonkeyPatch, q1: float, q3: float) -> _Analyzer:
    analyzer = _Analyzer(q1, q3)
    monkeypatch.setattr(
        "app.shared.llm_gateway.dependencies.llm_gateway_dependencies.get_stability_analyzer",
        lambda: analyzer,
    )
    return analyzer


@pytest.mark.unit
def test_keeps_all_values_below_minimum_sample_size() -> None:
    """Fewer than four values cannot be filtered and are returned unchanged."""
    values = [1.0, 2.0, 3.0]

    assert _remove_outliers_iqr(values) == values


@pytest.mark.unit
def test_four_values_are_filtered(monkeypatch: pytest.MonkeyPatch) -> None:
    """Exactly four values cross the minimum and are filtered."""
    _patch(monkeypatch, q1=10.0, q3=20.0)  # iqr 10 → upper = 20 + 1.5*10 = 35
    assert _remove_outliers_iqr([10.0, 20.0, 30.0, 100.0]) == [10.0, 20.0, 30.0]


@pytest.mark.unit
def test_upper_fence_uses_q3_plus_1_5_iqr(monkeypatch: pytest.MonkeyPatch) -> None:
    """A value exactly at the fence is kept; one just above is removed."""
    _patch(monkeypatch, q1=10.0, q3=20.0)  # upper = 35

    assert _remove_outliers_iqr([10.0, 20.0, 35.0, 36.0]) == [10.0, 20.0, 35.0]


@pytest.mark.unit
def test_percentiles_25_and_75_are_requested(monkeypatch: pytest.MonkeyPatch) -> None:
    """Both Q1 (25th) and Q3 (75th) are requested from the analyzer."""
    analyzer = _patch(monkeypatch, q1=1.0, q3=2.0)
    _remove_outliers_iqr([1.0, 2.0, 3.0, 4.0])
    assert analyzer.calls == [25, 75]
