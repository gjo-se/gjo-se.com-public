"""Restate activity for schema validation (CI Gate).

Validates that structured LLM output can be parsed against the task's
``output_schema`` definition. Makes a real LLM call with dummy variables.
When activated in ``gate_factories``, this gate runs after contract
validation and before the eval gates (1c, 1d, 1e) in ``CandidateEvalWorkflow``.
"""

from __future__ import annotations

from typing import Any

import structlog
from restate import Context, Service

from app.shared.db_access.session import AsyncSessionLocal
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_schema_gate
from app.shared.llm_gateway.services.gates.base import GateResult, _to_gate_result_dict

logger = structlog.get_logger(__name__)

schema_validation_service = Service("SchemaValidation")


@schema_validation_service.handler()
async def run(ctx: Context, task_key: str) -> dict[str, Any]:
    """Execute schema validation for a task.

    CI Gate — runs in ``CandidateEvalWorkflow`` after contract validation
    and before eval gates when activated. Makes a real LLM call with dummy
    variables and validates the structured output against the schema.

    Args:
        ctx: Restate workflow context.
        task_key: Task identifier from ``TASK_REGISTRY``.

    Returns:
        Serialized :class:`GateResult` dict with ``gate="schema_validation"``.
        Possible statuses: ``"passed"`` (schema valid), ``"failed"``
        (validation error), ``"skipped"`` (no schema defined),
        ``"blocked"`` (LLM crash or other error).
    """
    async with AsyncSessionLocal() as db:
        service = get_schema_gate()
        result: GateResult = await service._gate_schema(db, task_key)
        logger.info(
            "schema_validation: task=%s → %s (score=%.3f)",
            task_key,
            result.status,
            result.score,
        )
        return _to_gate_result_dict(result)
