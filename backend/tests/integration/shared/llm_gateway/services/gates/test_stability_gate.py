"""Integration tests for the stability gate 2a."""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.services.gates.stability_gate import StabilityGate


class _FailingClient:
    """LLM client double whose text call always fails."""

    async def call_text(self, *_args: object, **_kwargs: object) -> str:
        """Raise to simulate a provider failure."""
        raise RuntimeError("provider down")


def _failing_factory(task_key: str) -> _FailingClient:
    """Client factory returning a failing client."""
    return _FailingClient()


@pytest.mark.integration
async def test_stability_gate_fails_when_every_sample_call_fails(db_session: AsyncSession) -> None:
    """A candidate whose calls all fail yields a failed stability gate."""
    candidate = SimpleNamespace(id=1, model_id=1, credential_id=1)

    result = await StabilityGate(_failing_factory)._gate_stability(db_session, "inline-explain", candidate)

    assert result.status == "failed"
