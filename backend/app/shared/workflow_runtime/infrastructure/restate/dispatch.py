"""Restate workflow dispatch — invoke workflows and enqueue dispatchers.

Provides ``invoke_workflow`` (fire-and-forget ``/send``) and the concrete
enqueue wrappers used across the app. Split out of :mod:`client` – dispatch is
a distinct concern from the shared connection / state queries.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

import httpx
import structlog

from app.shared.config.config import settings
from app.shared.workflow_runtime.infrastructure.restate.client import get_restate_client

logger = structlog.get_logger(__name__)


class RestateUnavailableError(RuntimeError):
    """Restate-Ingress/Admin nicht erreichbar – echter Fehler (kein Worker-Warmup)."""


async def invoke_workflow(
    workflow_name: str,
    input_data: dict[str, Any],
    *,
    scope: str | None = None,
    raise_on_error: bool = False,
) -> str:
    """Invoke a Restate workflow asynchronously (fire-and-forget).

    Uses the ``/send`` endpoint so the call returns immediately with the
    invocation id — the workflow runs in the background.

    Restate is always-on and takes the invocation immediately; Restate's
    durable retry/backoff bridges the worker cold-start. The worker warm-up
    therefore runs concurrently (fire-and-forget) and never blocks this
    request.

    Args:
        workflow_name: Name of the Restate workflow (e.g. ``"BatchEvalWorkflow"``).
        input_data: JSON-serializable dict passed as the workflow handler's input.
        scope: Optional flow-control scope for concurrency limiting
            (e.g. ``"merge-bulk"``). When set, the invocation is routed through
            ``/restate/scope/{scope}/send/...`` and counts against the scope's
            concurrency budget.
        raise_on_error: If ``True``, raises ``RestateUnavailableError`` (a
            ``RuntimeError`` subclass) with the Restate error detail instead of
            returning a synthetic fallback id.

    Returns:
        The Restate invocation id (``inv_...``) or a synthetic ``rs_...`` id
        on failure (unless *raise_on_error* is ``True``).

    Raises:
        RestateUnavailableError: When *raise_on_error* is ``True`` and Restate
            returns a non-2xx status or is unreachable.
    """
    key = uuid.uuid4().hex[:12]
    # Restate always-on -> invoke immediately; worker warm-up runs in the
    # background (fire-and-forget) and Restate's durable retry bridges the
    # worker cold-start. This never blocks the request.
    from app.shared.workflow_runtime.infrastructure.restate.lifecycle import start_worker_warmup

    start_worker_warmup()  # fire-and-forget: scale Worker 0->1 + register (dev No-op)
    ingress = settings.RESTATE_INGRESS_URL
    if scope:
        url = f"{ingress}/restate/scope/{scope}/send/{workflow_name}/{key}/run"
    else:
        url = f"{ingress}/restate/send/{workflow_name}/{key}/run"

    logger.info("Restate invoke (async): %s key=%s scope=%s", workflow_name, key, scope)
    logger.debug("Restate invoke body: %s", json.dumps(input_data))

    try:
        response = await get_restate_client().post(
            url,
            json=input_data,
            headers={"Content-Type": "application/json"},
        )
        if response.is_success:
            inv_id = response.headers.get("x-restate-id", response.json().get("invocation_id", ""))
            logger.info(
                "Restate %s invoked → key=%s invocation=%s",
                workflow_name,
                key,
                inv_id,
            )
            # Return the workflow KEY (not invocation ID) — status
            # polling via get_workflow_state() needs the key.
            return key
        logger.warning(
            "Restate invoke %s returned %d: %s",
            workflow_name,
            response.status_code,
            response.text[:500],
        )
        if raise_on_error:
            raise RestateUnavailableError(
                f"Restate nicht erreichbar (Workflow {workflow_name}): "
                f"HTTP {response.status_code} auf {url} – {response.text[:300]}"
            )
    except httpx.TransportError:
        logger.warning(
            "Restate runtime not reachable at %s — workflow not invoked",
            settings.RESTATE_INGRESS_URL,
        )
        if raise_on_error:
            raise RestateUnavailableError(
                f"Restate nicht erreichbar (Workflow {workflow_name}): "
                f"Verbindung zu {settings.RESTATE_INGRESS_URL} fehlgeschlagen"
            ) from None
    except Exception:
        logger.exception("Restate invoke %s failed", workflow_name)
        if raise_on_error:
            raise

    # Fallback: return a synthetic id so callers don't break
    fallback_id = f"rs_{key}"
    logger.info("Restate fallback workflow_id=%s", fallback_id)
    return fallback_id


async def enqueue_eval_task(task_key: str, trigger: str) -> str:
    """Trigger a BatchEvalWorkflow for the given task.

    Args:
        task_key: Task identifier from ``TASK_REGISTRY``.
        trigger: What triggered this eval (e.g. ``"model_change"``).

    Returns:
        Restate workflow ID.
    """
    return await invoke_workflow(
        "BatchEvalWorkflow",
        {"task_key": task_key, "trigger": trigger},
    )


async def enqueue_merge(project_id: int, trigger: str = "pipeline") -> str:
    """Trigger a MergeWorkflow for the given project."""
    from app.shared.db_access.trace import trace

    invocation_id = await invoke_workflow(
        "MergeWorkflow",
        {"project_id": project_id, "trigger": trigger},
        scope="merge-bulk",
        raise_on_error=True,
    )
    trace("03_enqueue", project_id=project_id, restate_id=invocation_id, trigger=trigger)
    return invocation_id


async def enqueue_endcustomer_research(
    project_id: int,
    trigger: str = "pipeline",
    stop_after_act: int | None = None,
) -> str:
    """Trigger an EndCustomerResearchWorkflow for the given project.

    Uses the ``endcustomer-research`` flow-control scope so concurrent
    research runs are limited.

    Args:
        project_id: The project to research.
        trigger: Trigger label (e.g. ``"button"``).
        stop_after_act: If set (1-8), stop the pipeline after this act
            and return partial results (``phase="stopped"``).

    Returns:
        Restate workflow ID.
    """
    input_data: dict[str, object] = {"project_id": project_id, "trigger": trigger}
    if stop_after_act is not None:
        input_data["stop_after_act"] = stop_after_act
    return await invoke_workflow(
        "EndCustomerResearchWorkflow",
        input_data,
        scope="endcustomer-research",
        raise_on_error=True,
    )


async def enqueue_task(
    task_key: str,
    variables: dict[str, str],
    project_id: int,
    trigger: str,
    defer_seconds: int | None = None,
    auto_retry_attempt: int = 0,
) -> str:
    """Trigger a GenericTaskWorkflow for the given task.

    Args:
        task_key: Task identifier from ``TASK_REGISTRY``.
        variables: Placeholder values for the prompt template.
        project_id: Originating project id.
        trigger: Trigger label.
        defer_seconds: Optional delay before execution.
        auto_retry_attempt: Zero-based retry attempt counter.

    Returns:
        Restate workflow ID.
    """
    return await invoke_workflow(
        "GenericTaskWorkflow",
        {
            "task_key": task_key,
            "variables": variables,
            "project_id": project_id,
            "trigger": trigger,
            "defer_seconds": defer_seconds,
            "auto_retry_attempt": auto_retry_attempt,
        },
    )


async def enqueue_retry_batch(call_log_ids: list[int]) -> str:
    """Trigger a RetryBatchWorkflow for the given call-log IDs.

    Args:
        call_log_ids: Call-log row ids to retry.

    Returns:
        Restate workflow ID.
    """
    return await invoke_workflow(
        "RetryBatchWorkflow",
        {"call_log_ids": call_log_ids},
    )


async def enqueue_scan_code(trigger: str = "button") -> str:
    """Trigger a ScanCodeWorkflow for codebase analysis.

    Args:
        trigger: Trigger label (e.g. ``"button"``).

    Returns:
        Restate workflow ID.
    """
    return await invoke_workflow(
        "ScanCodeWorkflow",
        {"trigger": trigger},
        scope="scan-code",
        raise_on_error=True,
    )
