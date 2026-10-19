"""Integration tests for the CI/observation gates (contract, schema)."""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.services.gates.ci_obs import ContractGate
from app.shared.llm_gateway.services.gates.schema_gate import SchemaGate
from app.shared.llm_gateway.services.prompt_service import PromptTemplate


class _PromptServiceStub:
    """Prompt service double returning a fixed active template."""

    def __init__(self, template: PromptTemplate | None) -> None:
        self._template = template

    async def get_active_prompt(self, task: str) -> PromptTemplate | None:
        """Return the configured template regardless of the task."""
        return self._template


def _install_prompt_service(monkeypatch: pytest.MonkeyPatch, template: PromptTemplate | None) -> None:
    """Patch the prompt-service provider to return the given template."""
    monkeypatch.setattr(
        "app.shared.llm_gateway.dependencies.llm_gateway_dependencies.get_prompt_service",
        lambda: _PromptServiceStub(template),
    )


@pytest.mark.integration
async def test_contract_gate_passes_when_placeholders_match_registry(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A prompt whose placeholders equal the registry keys passes the gate."""
    _install_prompt_service(monkeypatch, PromptTemplate(task="inline-explain", user_prompt="{term} :: {context}"))

    result = await ContractGate()._gate_contract(db_session, "inline-explain")

    assert result.status == "passed"


@pytest.mark.integration
async def test_contract_gate_fails_when_a_registry_placeholder_is_missing(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A prompt missing a registry placeholder fails the gate."""
    _install_prompt_service(monkeypatch, PromptTemplate(task="inline-explain", user_prompt="{term} only"))

    result = await ContractGate()._gate_contract(db_session, "inline-explain")

    assert result.status == "failed"
    assert result.details["missing_in_prompt"] == ["context"]


@pytest.mark.integration
async def test_contract_gate_blocks_without_an_active_prompt(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Without an active prompt the contract gate is blocked."""
    _install_prompt_service(monkeypatch, None)

    result = await ContractGate()._gate_contract(db_session, "inline-explain")

    assert result.status == "blocked"


@pytest.mark.integration
async def test_schema_gate_skips_tasks_without_an_output_schema(db_session: AsyncSession) -> None:
    """A text-mode task without an output schema is skipped."""
    gate = SchemaGate(lambda task_key: SimpleNamespace())

    result = await gate._gate_schema(db_session, "description-merge")

    assert result.status == "skipped"
    assert result.details["reason"] == "No output schema defined"
