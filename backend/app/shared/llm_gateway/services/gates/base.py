"""Shared gate primitives: results, thresholds and low-level call helpers."""

from __future__ import annotations

import time
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Literal

import structlog

from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.client.client import LLMClient
from app.shared.llm_gateway.domain.task_model_config_contract import TaskModelConfigRecord
from app.shared.llm_gateway.domain.task_registry_rules import TaskDefinition
from app.shared.llm_gateway.services.task_executor_service import _resolve_output_schema

logger = structlog.get_logger(__name__)

# ── Gate thresholds ────────────────────────────────────────────────────────────

# Gate 1c – Direct Overhead
GATE_1C_DIRECT_OVERHEAD_THRESHOLD = 2.0
"""Gate 1c passes when client latency ≤ 2× direct latency."""
GATE_1C_N_DIRECT_CALLS = 3
"""Number of Direct-vs-Client call pairs for Gate 1c."""

# Gate 1d – Latency (History Baseline)
GATE_1D_BASELINE_TOLERANCE = 1.1
"""Gate 1d yellow-tier multiplier – candidate ≤ production × 1.1 is tolerated."""
GATE_1D_HISTORY_DAYS = 7
"""Lookback window (days) for the production baseline computation."""
_GATE_1D_HISTORY_MIN_SAMPLES = 5
"""Minimum call-log samples needed for a meaningful baseline."""

# Gate 1e – Stability
GATE_1E_N_CALLS = 3
"""Number of parallel calls for Gate 1e stability analysis."""
GATE_1E_SUCCESS_RATE_MIN = 0.9
"""Gate 1e passes when success rate ≥ 90%."""
GATE_1E_SIMILARITY_MIN = 0.7
"""Gate 1e passes when average pairwise cosine similarity ≥ 0.7."""
GATE_1E_LATENCY_CV_MAX = 0.5
"""Gate 1e passes when latency CV ≤ 0.5."""
GATE_1E_TOKEN_CV_MAX = 0.3
"""Gate 1e passes when token count CV ≤ 0.3."""

# Gate 1f – Audit
GATE_1F_EXPECTED_N_DEFAULT = 100
"""Gate 1f default expected call count for the last hour."""

# Golden Regression
GOLDEN_REGRESSION_MIN_SCORE = 0.0
"""Golden Regression passes when average experiment score ≥ threshold. Set to 0.0 during dataset build-up."""
GOLDEN_REGRESSION_MIN_ITEMS = 1
"""Golden Regression requires at least this many dataset items – returns ``skipped`` otherwise."""
_GOLDEN_REGRESSION_MIN_OUTPUT_LENGTH = 10
"""Golden Regression considers an output valid if it exceeds this character length."""

# ── Dummy placeholders ─────────────────────────────────────────────────────────

_DUMMY_PLACEHOLDERS: dict[str, str] = {
    "master_title": "Projekt Dummy-Titel",
    "master_description": "Dies ist eine Beispiel-Beschreibung für ein Master-Projekt.",
    "slave_descriptions": "Slave 1: Beispiel-Beschreibung A.\\nSlave 2: Beispiel-Beschreibung B.",
    "slave_count": "2",
    "merged_description": "Konsolidierte Projektbeschreibung für Skill-Extraktion.",
    "known_skills": "Python, FastAPI, Docker, React",
    "known_job_roles": "Fullstack-Entwickler, DevOps Engineer",
}


@dataclass
class GateResult:
    """Result of a single evaluation gate.

    Attributes:
        gate: Gate identifier (e.g. ``"1a"``, ``"2"``).
        status: ``"passed"``, ``"failed"``, ``"blocked"``, or ``"skipped"``.
        score: Normalised score (0.0 – 1.0).
        details: Arbitrary gate-specific metadata.
        timestamp: ISO-8601 timestamp of when the gate was executed.
    """

    gate: str
    status: Literal["passed", "failed", "blocked", "skipped"]
    score: float
    details: dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now(UTC).isoformat())


def _to_gate_result_dict(gr: GateResult) -> dict[str, Any]:
    """Serialize a :class:`GateResult` to a JSON-safe dict for ``gate_results``."""
    return {
        "gate": gr.gate,
        "status": gr.status,
        "score": gr.score,
        "details": gr.details,
        "timestamp": gr.timestamp,
    }


def _compute_overall_status(gate_results: list[GateResult]) -> str:
    """Derive the aggregate status from individual gate results.

    Priority: ``blocked`` > ``failed`` > ``passed``.
    Gates with ``skipped`` are ignored.
    """
    statuses = {gr.status for gr in gate_results if gr.status != "skipped"}
    if "blocked" in statuses:
        return "blocked"
    if "failed" in statuses:
        return "failed"
    if "passed" in statuses:
        return "passed"
    return "passed"


def _build_message_dicts(messages: list[Any]) -> list[dict[str, str]]:
    """Convert LangChain message objects to plain dicts for direct API calls."""
    result: list[dict[str, str]] = []
    for msg in messages:
        role = "system" if msg.__class__.__name__ == "SystemMessage" else "user"
        result.append({"role": role, "content": str(msg.content)})
    return result


async def _run_client_call(
    db: AsyncSession,
    task_key: str,
    candidate: TaskModelConfigRecord,
    definition: TaskDefinition,
    variables: dict[str, str],
    llm_client_factory: Callable[[str], LLMClient],
) -> int:
    """Single LLMClient call, returns duration_ms. Raises on failure."""
    client = llm_client_factory(task_key)
    logger.info("gate 1c: client call START")
    t0 = time.monotonic()
    if definition.output_mode == "structured" and definition.output_schema:
        await client.call(
            db=db,
            task=task_key,
            variables=variables,
            output_schema=_resolve_output_schema(definition.output_schema),
            trigger="eval_gate_1c",
            force_model_id=candidate.model_id,
            force_credential_id=candidate.credential_id,
        )
    else:
        await client.call_text(
            db=db,
            task=task_key,
            variables=variables,
            trigger="eval_gate_1c",
            force_model_id=candidate.model_id,
            force_credential_id=candidate.credential_id,
        )
    elapsed = int((time.monotonic() - t0) * 1000)
    logger.info("gate 1c: client call DONE in %dms", elapsed)
    return elapsed


async def _run_candidate_call(
    db: AsyncSession,
    task_key: str,
    candidate: TaskModelConfigRecord,
    definition: TaskDefinition,
    variables: dict[str, str],
    llm_client_factory: Callable[[str], LLMClient],
    *,
    trigger: str | None = None,
) -> str:
    """Run the candidate model (structured or text) and return its string output.

    Args:
        db: Active async database session.
        task_key: Task registry key.
        candidate: Candidate model/credential configuration.
        definition: Task definition carrying ``output_mode``/``output_schema``.
        variables: Prompt variables.
        llm_client_factory: Factory building an :class:`LLMClient` per task.
        trigger: Optional call-log trigger label.

    Returns:
        The model output as a string (empty when the structured result is falsy).
    """
    client = llm_client_factory(task_key)
    if definition.output_mode == "structured" and definition.output_schema:
        result = await client.call(
            db=db,
            task=task_key,
            variables=variables,
            output_schema=_resolve_output_schema(definition.output_schema),
            trigger=trigger,
            force_model_id=candidate.model_id,
            force_credential_id=candidate.credential_id,
        )
        return str(result) if result else ""
    return await client.call_text(
        db=db,
        task=task_key,
        variables=variables,
        trigger=trigger,
        force_model_id=candidate.model_id,
        force_credential_id=candidate.credential_id,
    )
