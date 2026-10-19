"""Restate activity for client latency — direct vs. wrapper comparison.

Compares the latency of direct LLM calls vs. client-wrapped calls to
detect excessive framework overhead.
"""

from __future__ import annotations

from typing import Any

import structlog
from restate import Context, Service
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access.session import AsyncSessionLocal
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_direct_overhead_gate
from app.shared.llm_gateway.domain.task_model_config_contract import TaskModelConfigRecord
from app.shared.llm_gateway.repositories import task_model_config_repository
from app.shared.llm_gateway.services.gates.base import GateResult, _to_gate_result_dict

logger = structlog.get_logger(__name__)

client_latency_service = Service("ClientLatency")


@client_latency_service.handler()
async def run(ctx: Context, arg: dict[str, Any]) -> dict[str, Any]:
    """Execute client latency measurement for a candidate.

    Args:
        ctx: Restate workflow context.
        arg: Dict with ``task_key`` (str) and ``candidate_id`` (int) keys.

    Returns:
        Serialized :class:`GateResult` dict with ``gate="client_latency"``.
    """
    task_key: str = arg["task_key"]
    candidate_id: int = arg["candidate_id"]
    async with AsyncSessionLocal() as db:
        candidate = await _load_candidate(db, candidate_id)
        service = get_direct_overhead_gate()
        result: GateResult = await service._gate_direct_overhead(db, task_key, candidate)
        logger.info(
            "client_latency: task=%s candidate_id=%d → %s (score=%.3f)",
            task_key,
            candidate_id,
            result.status,
            result.score,
        )
        return _to_gate_result_dict(result)


async def _load_candidate(db: AsyncSession, candidate_id: int) -> TaskModelConfigRecord:
    """Load a task-model-config by primary key as a service-boundary record."""
    record = await task_model_config_repository.get_by_id(db, candidate_id)
    if record is None:
        raise LookupError(f"TaskModelConfig {candidate_id} not found")
    return record
