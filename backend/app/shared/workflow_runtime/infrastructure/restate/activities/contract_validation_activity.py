"""Restate activity for contract validation (CI Gate).

Validates that prompt template placeholders match the ``TASK_REGISTRY``
definition. Pure string-matching — no LLM call. When activated in
``gate_factories``, this gate runs before the eval gates (1c, 1d, 1e)
in ``CandidateEvalWorkflow``.
"""

from __future__ import annotations

from typing import Any

import structlog
from restate import Context, Service

from app.shared.db_access.session import AsyncSessionLocal
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_contract_gate
from app.shared.llm_gateway.services.gates.base import GateResult, _to_gate_result_dict

logger = structlog.get_logger(__name__)

contract_validation_service = Service("ContractValidation")


@contract_validation_service.handler()
async def run(ctx: Context, task_key: str) -> dict[str, Any]:
    """Execute contract validation for a task.

    CI Gate — runs in ``CandidateEvalWorkflow`` before eval gates
    when activated. Requires no candidate — validates the prompt
    template against ``TASK_REGISTRY``.

    Args:
        ctx: Restate workflow context.
        task_key: Task identifier from ``TASK_REGISTRY``.

    Returns:
        Serialized :class:`GateResult` dict with ``gate="contract_validation"``.
        Possible statuses: ``"passed"`` (placeholders match),
        ``"failed"`` (mismatch), ``"blocked"`` (no active prompt).
    """
    async with AsyncSessionLocal() as db:
        service = get_contract_gate()
        result: GateResult = await service._gate_contract(db, task_key)
        logger.info(
            "contract_validation: task=%s → %s (score=%.3f)",
            task_key,
            result.status,
            result.score,
        )
        return _to_gate_result_dict(result)
