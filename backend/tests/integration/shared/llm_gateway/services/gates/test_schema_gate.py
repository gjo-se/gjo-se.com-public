"""Integration tests for the schema validation gate 1b."""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.services.gates.schema_gate import SchemaGate


@pytest.mark.integration
async def test_schema_gate_skips_tasks_without_an_output_schema(db_session: AsyncSession) -> None:
    """A text-mode task without an output schema is skipped."""
    gate = SchemaGate(lambda task_key: SimpleNamespace())

    result = await gate._gate_schema(db_session, "description-merge")

    assert result.status == "skipped"
    assert result.details["reason"] == "No output schema defined"
