"""IQR outlier filtering shared by latency-baseline computations."""

from __future__ import annotations


def _remove_outliers_iqr(values: list[float]) -> list[float]:
    """Remove outliers using the IQR method (Q3 + 1.5 × IQR).

    Args:
        values: List of numeric values.

    Returns:
        Filtered list with outliers above the upper fence removed.
    """
    _min_values_for_iqr = 4
    if len(values) < _min_values_for_iqr:
        return values
    sorted_vals = sorted(values)

    from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_stability_analyzer

    analyzer = get_stability_analyzer()
    q1 = analyzer.percentile(sorted_vals, 25)
    q3 = analyzer.percentile(sorted_vals, 75)
    iqr = q3 - q1
    upper = q3 + 1.5 * iqr
    return [v for v in values if v <= upper]
