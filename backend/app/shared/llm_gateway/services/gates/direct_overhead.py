"""Direct-overhead primitives for evaluation gate 1c.

Owns the low-level timing of a direct provider call and the result assembly
for the client-vs-direct overhead comparison.
"""

from __future__ import annotations

import time
from typing import Any

import structlog

from app.shared.llm_gateway.services.gates.base import GATE_1C_DIRECT_OVERHEAD_THRESHOLD

logger = structlog.get_logger(__name__)


def _build_direct_overhead_result(
    direct_times: list[int],
    client_times: list[int],
) -> dict[str, Any]:
    """Build the Gate 1c result dict from collected timing data."""
    n = len(direct_times)
    avg_direct = sum(direct_times) / n
    avg_client = sum(client_times) / n
    overhead_ratio = avg_client / max(avg_direct, 1)
    passed = overhead_ratio <= GATE_1C_DIRECT_OVERHEAD_THRESHOLD
    score = min(1.0, 1.0 / max(overhead_ratio, 0.01))

    return {
        "status": "passed" if passed else "failed",
        "score": round(score, 4),
        "samples": n,
        "direct_ms": direct_times,
        "client_ms": client_times,
        "avg_direct_ms": round(avg_direct, 1),
        "avg_client_ms": round(avg_client, 1),
        "overhead_ratio": round(overhead_ratio, 2),
        "threshold": GATE_1C_DIRECT_OVERHEAD_THRESHOLD,
    }


async def _run_direct_call(
    direct_params: dict[str, Any],
    messages: list[dict[str, str]],
) -> int:
    """Single direct API call, returns duration_ms. Raises on failure."""
    from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_direct_client

    t0 = time.monotonic()
    await get_direct_client().call(
        messages=messages,
        model_identifier=direct_params["model_identifier"],
        api_key=direct_params["api_key"],
        portal=direct_params["portal"],
        api_base=direct_params["api_base"],
    )
    elapsed = int((time.monotonic() - t0) * 1000)
    logger.info("gate 1c: direct call DONE in %dms", elapsed)
    return elapsed
