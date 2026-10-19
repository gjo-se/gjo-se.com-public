"""Unit tests for the Restate safe-SQL-value guard."""

from __future__ import annotations

import pytest

from app.shared.workflow_runtime.infrastructure.restate.query import (
    UnsafeSqlValueError,
    require_safe_sql_value,
)

pytestmark = pytest.mark.unit


@pytest.mark.parametrize("value", ["MergeWorkflow", "rs_1a2b3c", "a_b.c-d"])
def test_returns_safe_value_unchanged(value: str) -> None:
    """Values inside the strict allowlist pass through unchanged."""
    assert require_safe_sql_value(value, field="x") == value


@pytest.mark.parametrize("value", ["a'b", "a;b", "a b", "a\\b", "a%b"])
def test_raises_for_unsafe_value(value: str) -> None:
    """Characters outside the allowlist raise UnsafeSqlValueError."""
    with pytest.raises(UnsafeSqlValueError):
        require_safe_sql_value(value, field="x")
