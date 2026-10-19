"""Integration tests for the direct-overhead gate 1c module."""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.services.gates.direct_overhead_gate import DirectOverheadGate


def _candidate() -> SimpleNamespace:
    """Return a minimal task-model-config double."""
    return SimpleNamespace(id=1, model_id=999_999, credential_id=1)


def _noop_factory(task_key: str) -> None:
    """Client factory that is never invoked in these tests."""
    return


@pytest.mark.integration
async def test_direct_overhead_gate_blocks_without_a_resolvable_model(db_session: AsyncSession) -> None:
    """An unresolvable candidate model blocks the overhead gate."""
    result = await DirectOverheadGate(_noop_factory)._gate_direct_overhead(
        db_session, "description-merge", _candidate()
    )

    assert result.status == "blocked"
