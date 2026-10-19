"""Unit tests for the evaluation-run model."""

from __future__ import annotations

import pytest

from app.shared.llm_gateway.models.eval_run import EvalRun


@pytest.mark.unit
def test_eval_run_table_contract_requires_task_trigger_status() -> None:
    """A run row always carries task, trigger and overall_status."""
    table = EvalRun.__table__
    assert table.name == "shared_eval_run"
    assert table.c.task.nullable is False
    assert table.c.trigger.nullable is False
    assert table.c.overall_status.nullable is False


@pytest.mark.unit
def test_eval_run_stores_gate_results_as_nullable_json() -> None:
    """Per-gate results are persisted as a nullable JSON collection."""
    table = EvalRun.__table__

    assert table.c.gate_results.nullable is True
    assert table.c.model_config_id.nullable is True
