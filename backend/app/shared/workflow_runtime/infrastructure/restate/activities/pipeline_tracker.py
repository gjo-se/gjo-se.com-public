"""Lightweight per-act progress tracker for the endcustomer research pipeline.

Writes a call-log row (``task="endcustomer-pipeline"``) before each act starts
(``success=None`` → pending) and completes it after the act finishes.

Restate-internal exceptions (``SdkInternalBaseException``: suspension, retry)
are deliberately NOT logged as failures – they are safe to ignore and Restate
resumes them automatically.
"""

from __future__ import annotations

import json
import time
from types import TracebackType

import structlog
from restate.exceptions import is_internal_exception

from app.shared.llm_gateway.models.call_log import CallErrorType
from app.shared.llm_gateway.services.call_log_service import CallLogService

logger = structlog.get_logger(__name__)


async def log_act_start(
    service: CallLogService,
    project_id: int,
    phase: str,
    trigger: str = "pipeline",
) -> int | None:
    """Write a pending call-log row before an act starts – **idempotent**.

    On Restate workflow replay, the ``__aenter__`` runs again.  This
    function first checks whether a pending row already exists for the
    same ``(project_id, phase)`` and reuses its id; otherwise a fresh
    pending row is created.

    Args:
        service: The injected :class:`CallLogService`.
        project_id: Originating project.
        phase: Phase label, e.g. ``"Act 1"``.
        trigger: Trigger label.

    Returns:
        The call-log id (existing or new), or ``None`` on failure.
    """
    existing = await service.find_pending(
        task="endcustomer-pipeline",
        project_id=project_id,
        phase=phase,
    )
    if existing is not None:
        logger.debug("log_act_start: reusing pending row %d for %s", existing, phase)
        return existing
    return await service.record(
        task="endcustomer-pipeline",
        call_type="activity",
        success=None,
        project_id=project_id,
        phase=phase,
        trigger=trigger,
    )


async def log_act_complete(
    service: CallLogService,
    call_log_id: int | None,
    *,
    success: bool,
    duration_ms: int | None = None,
    error_message: str | None = None,
    output_snapshot: str | None = None,
) -> None:
    """Complete a pending call-log row after an act finishes.

    Args:
        service: The injected :class:`CallLogService`.
        call_log_id: The id from :func:`log_act_start`, or ``None``.
        success: ``True`` if the act succeeded.
        duration_ms: Wall-clock duration in ms.
        error_message: Human-readable error detail on failure.
    """
    if call_log_id is None:
        return
    await service.complete(
        call_log_id,
        success=success,
        error_type=CallErrorType.UNKNOWN if not success else None,
        error_message=error_message,
        duration_ms=duration_ms,
        output_snapshot=output_snapshot,
    )


class ActTracker:
    """Context-manager wrapper to log act start/complete around an async block.

    Usage::

        async with ActTracker(project_id, "Act 3", get_llm_call_log_service(), trigger="button") as tracker:
            ...  # do the work
            tracker.result = {"candidates_count": 23}

    The tracker writes ``success=True`` on clean exit and ``success=False`` on
    exception.
    """

    def __init__(
        self,
        project_id: int,
        phase: str,
        service: CallLogService,
        trigger: str = "pipeline",
    ) -> None:
        self.project_id = project_id
        self.phase = phase
        self._service = service
        self.trigger = trigger
        self.call_log_id: int | None = None
        self.result: object = None
        self._started_at: float = 0.0

    async def __aenter__(self) -> ActTracker:
        """Start timing and open an act-log row for this phase.

        Returns:
            ``self`` so the tracker binds to the ``async with`` target.
        """
        self._started_at = time.monotonic()
        self.call_log_id = await log_act_start(
            self._service,
            self.project_id,
            self.phase,
            self.trigger,
        )
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        _exc_tb: TracebackType | None,
    ) -> bool:
        """Close the act-log row, recording success or failure.

        Restate-internal exceptions (suspension/retry) are not treated as
        failures. Always returns ``False`` so exceptions propagate.

        Args:
            exc_type: Exception type, or ``None`` on clean exit.
            exc_val: Exception instance, if any.
            _exc_tb: Traceback, if any.

        Returns:
            ``False`` to let any exception propagate.
        """
        duration_ms = int((time.monotonic() - self._started_at) * 1000)
        if exc_type is not None:
            # Restate-internal exceptions (suspension, retry) are NOT failures.
            if is_internal_exception(exc_val):
                logger.debug(
                    "ActTracker: Restate-internal exception in %s – not logging as failure",
                    self.phase,
                )
                return False  # re-raise – Restate handles it
            await log_act_complete(
                self._service,
                self.call_log_id,
                success=False,
                duration_ms=duration_ms,
                error_message=str(exc_val),
            )
            return False  # re-raise
        await log_act_complete(
            self._service,
            self.call_log_id,
            success=True,
            duration_ms=duration_ms,
            output_snapshot=json.dumps(self.result) if self.result is not None else None,
        )
        return False
