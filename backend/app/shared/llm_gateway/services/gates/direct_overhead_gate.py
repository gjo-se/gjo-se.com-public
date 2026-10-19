"""Gate 1c – direct-overhead comparison between client and provider calls."""

from __future__ import annotations

import asyncio
import time
from typing import Any

import structlog

from app.shared.credential_store.repositories import admin_credential_repository
from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.domain.llm_consumer_contract import LLMClientFactoryConsumer
from app.shared.llm_gateway.domain.task_model_config_contract import TaskModelConfigRecord
from app.shared.llm_gateway.domain.task_registry_rules import TASK_REGISTRY, TaskDefinition
from app.shared.llm_gateway.repositories import (
    call_log_repository,
    model_repository,
    provider_repository,
)
from app.shared.llm_gateway.services.gates.base import (
    GATE_1C_DIRECT_OVERHEAD_THRESHOLD,
    GATE_1C_N_DIRECT_CALLS,
    GateResult,
    _build_message_dicts,
    _run_client_call,
)
from app.shared.llm_gateway.services.gates.direct_overhead import (
    _build_direct_overhead_result,
    _run_direct_call,
)
from app.shared.llm_gateway.services.task_executor_service import _resolve_output_schema

logger = structlog.get_logger(__name__)


class DirectOverheadGate(LLMClientFactoryConsumer):
    """Gate 1c: measure client-overhead versus direct provider calls."""

    async def _gate_direct_overhead(
        self,
        db: AsyncSession,
        task_key: str,
        candidate: TaskModelConfigRecord,
    ) -> GateResult:
        """N Direct + N Client calls all running in parallel.

        All 6 calls fire simultaneously via ``asyncio.gather``.
        Passes when avg_client ≤ 2× avg_direct.
        """
        # Resolve direct-call parameters once (shared across all calls).
        direct_params = await self._resolve_direct_call_params(db, candidate)
        if direct_params is None:
            return GateResult(
                gate="client_latency",
                status="blocked",
                score=0,
                details={"error": "Failed to resolve direct call parameters"},
            )

        # Fetch N recent call logs for real input variables.
        rows = await call_log_repository.list_recent_with_input(db, task_key, GATE_1C_N_DIRECT_CALLS)

        if not rows:
            return GateResult(
                gate="client_latency",
                status="blocked",
                score=0,
                details={"error": "No call logs with input variables"},
            )

        # Prepare all messages upfront (sequentially – DB queries).
        call_inputs: list[dict[str, Any]] = []
        for call_log in rows:
            variables = (call_log.input_snapshot or {}).get("variables", {})
            if not isinstance(variables, dict) or not variables:
                continue
            client = self._llm_client_factory(task_key)
            prepared = await client._prepare(
                db,
                task_key,
                variables,
                force_model_id=candidate.model_id,
                force_credential_id=candidate.credential_id,
            )
            call_inputs.append(
                {
                    "messages": _build_message_dicts(prepared.messages),
                    "variables": variables,
                }
            )

        if not call_inputs:
            return GateResult(
                gate="client_latency",
                status="blocked",
                score=0,
                details={"error": "No valid call inputs"},
            )

        definition = TASK_REGISTRY[task_key]

        # Build all tasks – 3 Direct + 3 Client.
        tasks: list[Any] = [_run_direct_call(direct_params, ci["messages"]) for ci in call_inputs]
        tasks.extend(
            _run_client_call(
                db,
                task_key,
                candidate,
                definition,
                ci["variables"],
                self._llm_client_factory,
            )
            for ci in call_inputs
        )

        logger.info("gate 1c: firing %d calls in parallel", len(tasks))
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Split results: first half = Direct, second half = Client.
        n = len(call_inputs)
        direct_results = results[:n]
        client_results = results[n:]

        direct_times: list[int] = []
        for i, r in enumerate(direct_results):
            if isinstance(r, BaseException):
                logger.warning("gate 1c: direct call %d/%d failed: %s", i + 1, n, r)
                return GateResult(
                    gate="client_latency",
                    status="blocked",
                    score=0,
                    details={"error": f"Direct call {i + 1} failed: {r}"},
                )
            direct_times.append(r)

        client_times: list[int] = []
        for i, r in enumerate(client_results):
            if isinstance(r, BaseException):
                logger.warning("gate 1c: client call %d/%d failed: %s", i + 1, n, r)
                return GateResult(
                    gate="client_latency",
                    status="blocked",
                    score=0,
                    details={"error": f"Client call {i + 1} failed: {r}"},
                )
            client_times.append(r)

        logger.info("gate 1c: all %d calls done", len(tasks))

        avg_direct = sum(direct_times) / n
        avg_client = sum(client_times) / n
        overhead_ratio = avg_client / max(avg_direct, 1)
        passed = overhead_ratio <= GATE_1C_DIRECT_OVERHEAD_THRESHOLD
        score = min(1.0, 1.0 / max(overhead_ratio, 0.01))
        return GateResult(
            gate="client_latency",
            status="passed" if passed else "failed",
            score=round(score, 4),
            details={
                "avg_direct_ms": round(avg_direct, 1),
                "avg_client_ms": round(avg_client, 1),
                "overhead_ratio": round(overhead_ratio, 2),
                "samples": n,
                "direct_ms": direct_times,
                "client_ms": client_times,
                "threshold": GATE_1C_DIRECT_OVERHEAD_THRESHOLD,
            },
        )

    async def _resolve_direct_call_params(
        self,
        db: AsyncSession,
        candidate: TaskModelConfigRecord,
    ) -> dict[str, Any] | None:
        """Resolve model identifier, api_key, portal, and api_base for a direct call.

        Returns a dict with keys ``model_identifier``, ``api_key``, ``portal``,
        ``api_base``, or ``None`` if resolution fails.
        """
        from app.shared.credential_store.dependencies.credential_store_dependencies import (
            get_admin_credential_service,
        )

        model_record = await model_repository.get_identity(db, candidate.model_id)
        if model_record is None:
            return None

        api_base = await provider_repository.get_api_base_by_id(db, model_record.provider_id)

        if candidate.credential_id is None:
            return None

        cred_record = await admin_credential_repository.get_record_by_id(db, candidate.credential_id)
        if cred_record is None:
            return None

        portal = cred_record.portal
        model_identifier = model_record.openrouter_id if portal == "openrouter" else model_record.native_model_id

        credentials = await get_admin_credential_service().get_credentials(db, cred_record.service)
        api_key = credentials.get("api_key") if credentials else None
        if not api_key:
            return None

        return {
            "model_identifier": model_identifier,
            "api_key": api_key,
            "portal": portal,
            "api_base": api_base,
        }

    async def _run_direct_overhead_check(
        self,
        db: AsyncSession,
        task_key: str,
        candidate: TaskModelConfigRecord,
        definition: TaskDefinition,
    ) -> dict[str, Any]:
        """1c: N Direct-vs-Client call pairs using the candidate's model.

        Call pairs run in parallel – each pair does Direct THEN Client
        sequentially, but pairs are gathered concurrently.
        """
        # Resolve direct-call parameters once (shared across all pairs).
        direct_params = await self._resolve_direct_call_params(db, candidate)
        if direct_params is None:
            return {"status": "blocked", "score": 0, "error": "Failed to resolve call parameters"}

        # Fetch N recent call logs for real inputs.
        rows = await call_log_repository.list_recent_with_input(db, task_key, GATE_1C_N_DIRECT_CALLS)

        if not rows:
            return {"status": "blocked", "score": 0, "error": "No call logs with variables"}

        # Build tasks for parallel execution.
        pair_tasks: list[Any] = []
        for i, call_log in enumerate(rows):
            variables = (call_log.input_snapshot or {}).get("variables", {})
            if not isinstance(variables, dict) or not variables:
                continue

            # Prepare messages inside a per-task LLMClient for thread safety.
            task_client = self._llm_client_factory(task_key)
            prepared = await task_client._prepare(
                db,
                task_key,
                variables,
                force_model_id=candidate.model_id,
                force_credential_id=candidate.credential_id,
            )
            messages = _build_message_dicts(prepared.messages)

            pair_tasks.append(
                self._call_direct_and_client(
                    db,
                    task_key,
                    candidate,
                    definition,
                    variables,
                    messages,
                    direct_params,
                    i + 1,
                    len(rows),
                )
            )

        # Run pairs sequentially to avoid DB connection exhaustion.
        direct_times: list[int] = []
        client_times: list[int] = []
        for idx, pair_task in enumerate(pair_tasks):
            try:
                result = await pair_task
            except Exception as exc:
                logger.exception(
                    "evaluation_service: gate 1c pair %d/%d crashed",
                    idx + 1,
                    len(pair_tasks),
                )
                return {"status": "blocked", "score": 0, "error": f"Call pair {idx + 1} crashed: {exc}"}
            if result is None:
                return {"status": "blocked", "score": 0, "error": f"Call pair {idx + 1} failed"}
            direct_times.append(result[0])
            client_times.append(result[1])

        if not direct_times:
            return {"status": "blocked", "score": 0, "error": "No valid call pairs"}

        return _build_direct_overhead_result(direct_times, client_times)

    async def _call_direct_and_client(
        self,
        db: AsyncSession,
        task_key: str,
        candidate: TaskModelConfigRecord,
        definition: TaskDefinition,
        variables: dict[str, str],
        messages: list[dict[str, str]],
        direct_params: dict[str, Any],
        idx: int,
        total: int,
    ) -> tuple[int, int] | None:
        """Execute one Direct-vs-Client call pair. Returns (direct_ms, client_ms) or None."""
        client = self._llm_client_factory(task_key)

        # Direct call.
        t0 = time.monotonic()
        try:
            from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_direct_client

            await get_direct_client().call(
                messages=messages,
                model_identifier=direct_params["model_identifier"],
                api_key=direct_params["api_key"],
                portal=direct_params["portal"],
                api_base=direct_params["api_base"],
            )
        except Exception:
            logger.exception(
                "evaluation_service: gate 1c direct %d/%d failed",
                idx,
                total,
            )
            return None
        direct_ms = int((time.monotonic() - t0) * 1000)

        # Client call.
        t0 = time.monotonic()
        try:
            if definition.output_mode == "structured" and definition.output_schema:
                await client.call(
                    db=db,
                    task=task_key,
                    variables=variables,
                    output_schema=_resolve_output_schema(definition.output_schema),
                    force_model_id=candidate.model_id,
                    force_credential_id=candidate.credential_id,
                )
            else:
                await client.call_text(
                    db=db,
                    task=task_key,
                    variables=variables,
                    force_model_id=candidate.model_id,
                    force_credential_id=candidate.credential_id,
                )
        except Exception:
            logger.exception(
                "evaluation_service: gate 1c client %d/%d failed",
                idx,
                total,
            )
            return None
        client_ms = int((time.monotonic() - t0) * 1000)

        return (direct_ms, client_ms)
