"""Call lifecycle for the LLM client – logging, retry wrapping, streaming.

Composed into :class:`~app.shared.llm_gateway.client.client.LLMClient` via
inheritance (mirroring ``LLMClientFactoryMixin``): the prepare → log-start →
invoke → log-success/failure skeleton and the ``llm_call_log`` instrumentation
live here, so the client module keeps a single responsibility.
"""

from __future__ import annotations

import time
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import dataclass
from typing import Any, cast

import structlog
from langfuse import observe
from langfuse.langchain import CallbackHandler as LangfuseCallbackHandler
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.client.errors import classify_exception
from app.shared.llm_gateway.client.prepared_call import _PreparedCall
from app.shared.llm_gateway.langfuse_client import get_langfuse_client
from app.shared.llm_gateway.models.call_log import CallType

_logger = structlog.get_logger(__name__)


@dataclass
class _UsageSink:
    """Mutable sink for token usage captured inside the invoke callback."""

    value: dict[str, int] | None = None


class LLMCallLifecycleMixin:
    """Prepare → log → invoke → log lifecycle plus ``llm_call_log`` writes."""

    _call_log_id: int | None = None

    async def _run_request[T](
        self,
        *,
        db: AsyncSession,
        task: str,
        variables: dict[str, str],
        call_type: CallType,
        prepare: Callable[[], Awaitable[_PreparedCall]],
        invoke: Callable[[_PreparedCall, LangfuseCallbackHandler, _UsageSink], Awaitable[T]],
        to_output: Callable[[T], str | None],
        project_id: int | None,
        trigger: str | None,
        phase: str | None,
    ) -> T:
        """Run a non-streaming call through the shared prepare/log/invoke skeleton.

        Args:
            db: Active async database session (closed after resolution).
            task: Task identifier (call-log context).
            variables: Placeholder values (call-log context).
            call_type: ``STRUCTURED`` or ``TEXT`` (call-log context).
            prepare: Awaited resolution producing the prepared call.
            invoke: Awaited provider invocation returning the result; captures
                token usage into the supplied sink.
            to_output: Maps the result onto the call-log output snapshot.
            project_id: Optional originating project id (call-log context).
            trigger: Optional trigger label (call-log context).
            phase: Optional pipeline phase (call-log context).

        Returns:
            The value returned by *invoke*.
        """
        started = time.monotonic()
        prepared: _PreparedCall | None = None
        usage = _UsageSink()
        langfuse = get_langfuse_client()
        langfuse_handler = LangfuseCallbackHandler()
        try:
            prepared = await prepare()

            # Release the DB session now – resolution is the only consumer.
            # The LLM API call takes 20-40s; holding the session idle would
            # starve other requests (DB pool exhaustion).
            if hasattr(db, "close"):
                await cast(Any, db).close()

            await self._log_start(
                task,
                call_type,
                prepared,
                project_id,
                trigger,
                phase,
                input_snapshot={**prepared.input_snapshot, "call_type": call_type.value},
            )

            result = await invoke(prepared, langfuse_handler, usage)
        except Exception as exc:
            call_snapshot = {**prepared.input_snapshot, "call_type": call_type.value} if prepared else None
            await self._log_failure(
                exc,
                task,
                call_type,
                prepared,
                project_id,
                trigger,
                started,
                phase,
                input_snapshot=call_snapshot,
                usage=usage.value,
            )
            if langfuse:
                langfuse.flush()
            raise
        call_snapshot = {**prepared.input_snapshot, "call_type": call_type.value} if prepared else None
        await self._log_success(
            task,
            call_type,
            prepared,
            project_id,
            trigger,
            started,
            phase,
            input_snapshot=call_snapshot,
            output=to_output(result),
            usage=usage.value,
        )
        if langfuse:
            langfuse.flush()
        return result

    async def _run_stream(
        self,
        *,
        db: AsyncSession,
        task: str,
        variables: dict[str, str],
        call_type: CallType,
        prepare: Callable[[], Awaitable[_PreparedCall]],
        stream: Callable[[_PreparedCall, LangfuseCallbackHandler], AsyncIterator[str]],
        project_id: int | None,
        trigger: str | None,
        phase: str | None,
    ) -> AsyncIterator[str]:
        """Run a streamed call through the shared prepare/log/stream skeleton.

        Args:
            db: Active async database session (not closed – the caller owns it).
            task: Task identifier (call-log context).
            variables: Placeholder values (call-log context).
            call_type: ``STREAM`` (call-log context).
            prepare: Awaited resolution producing the prepared call.
            stream: Async generator yielding non-empty text chunks.
            project_id: Optional originating project id (call-log context).
            trigger: Optional trigger label (call-log context).
            phase: Optional pipeline phase (call-log context).

        Yields:
            Non-empty text chunks in generation order.
        """
        started = time.monotonic()
        prepared: _PreparedCall | None = None
        accumulated: list[str] = []
        langfuse = get_langfuse_client()
        langfuse_handler = LangfuseCallbackHandler()
        try:
            prepared = await prepare()
            await self._log_start(
                task,
                call_type,
                prepared,
                project_id,
                trigger,
                phase,
                input_snapshot={**prepared.input_snapshot, "call_type": call_type.value},
            )
            async for text in stream(prepared, langfuse_handler):
                accumulated.append(text)
                yield text
        except Exception as exc:
            call_snapshot = {**prepared.input_snapshot, "call_type": call_type.value} if prepared else None
            await self._log_failure(
                exc,
                task,
                call_type,
                prepared,
                project_id,
                trigger,
                started,
                phase,
                input_snapshot=call_snapshot,
            )
            if langfuse:
                langfuse.flush()
            raise
        call_snapshot = {**prepared.input_snapshot, "call_type": call_type.value} if prepared else None
        output = "".join(accumulated) if accumulated else None
        await self._log_success(
            task,
            call_type,
            prepared,
            project_id,
            trigger,
            started,
            phase,
            input_snapshot=call_snapshot,
            output=output,
        )
        if langfuse:
            langfuse.flush()

    # ── Instrumentation helpers ─────────────────────────────────────────────

    @observe(name="llm-log")
    async def _log_start(
        self,
        task: str,
        call_type: CallType,
        prepared: _PreparedCall,
        project_id: int | None,
        trigger: str | None,
        phase: str | None = None,
        *,
        input_snapshot: dict[str, Any] | None = None,
    ) -> None:
        """Write a pending (success=NULL) call-log row and store its id.

        Called right before the LLM invocation so the admin UI can see
        in-progress calls immediately, even if the call takes 30+ seconds.
        """
        from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_llm_call_log_service

        self._call_log_id = await get_llm_call_log_service().record(
            task=task,
            call_type=call_type.value,
            success=None,  # pending
            project_id=project_id,
            trigger=trigger,
            phase=phase,
            resolved_model=prepared.model_identifier,
            resolved_credential=prepared.credential_service,
            duration_ms=None,
            input_snapshot=input_snapshot,
        )

    @staticmethod
    def _elapsed_ms(started: float) -> int:
        """Return elapsed milliseconds since *started* (monotonic clock)."""
        return int((time.monotonic() - started) * 1000)

    @observe(name="llm-log")
    async def _log_success(
        self,
        task: str,
        call_type: CallType,
        prepared: _PreparedCall | None,
        project_id: int | None,
        trigger: str | None,
        started: float,
        phase: str | None = None,
        *,
        input_snapshot: dict[str, Any] | None = None,
        output: str | None = None,
        usage: dict[str, int] | None = None,
    ) -> None:
        """Complete a pending row as success, or insert directly if no pending row."""
        from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_llm_call_log_service

        duration_ms = self._elapsed_ms(started)
        prompt_tokens = usage.get("prompt_tokens") if usage else None
        completion_tokens = usage.get("completion_tokens") if usage else None
        total_tokens = usage.get("total_tokens") if usage else None

        if self._call_log_id is not None:
            await get_llm_call_log_service().complete(
                self._call_log_id,
                success=True,
                duration_ms=duration_ms,
                output_snapshot=output,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
            )
        else:
            self._call_log_id = await get_llm_call_log_service().record(
                task=task,
                call_type=call_type.value,
                success=True,
                project_id=project_id,
                trigger=trigger,
                phase=phase,
                resolved_model=prepared.model_identifier if prepared else None,
                resolved_credential=prepared.credential_service if prepared else None,
                duration_ms=duration_ms,
                input_snapshot=input_snapshot,
                output_snapshot=output,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
            )

    @observe(name="llm-log")
    async def _log_failure(
        self,
        exc: BaseException,
        task: str,
        call_type: CallType,
        prepared: _PreparedCall | None,
        project_id: int | None,
        trigger: str | None,
        started: float,
        phase: str | None = None,
        *,
        input_snapshot: dict[str, Any] | None = None,
        usage: dict[str, int] | None = None,
    ) -> None:
        """Complete a pending row as failure, or insert directly if no pending row."""
        from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_llm_call_log_service

        error_enum = classify_exception(exc)
        duration_ms = self._elapsed_ms(started)
        prompt_tokens = usage.get("prompt_tokens") if usage else None
        completion_tokens = usage.get("completion_tokens") if usage else None
        total_tokens = usage.get("total_tokens") if usage else None

        if self._call_log_id is not None:
            await get_llm_call_log_service().complete(
                self._call_log_id,
                success=False,
                error_type=error_enum,
                error_message=str(exc),
                duration_ms=duration_ms,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
            )
        else:
            self._call_log_id = await get_llm_call_log_service().record(
                task=task,
                call_type=call_type.value,
                success=False,
                project_id=project_id,
                trigger=trigger,
                phase=phase,
                error_type=error_enum,
                error_message=str(exc),
                resolved_model=prepared.model_identifier if prepared else None,
                resolved_credential=prepared.credential_service if prepared else None,
                duration_ms=duration_ms,
                input_snapshot=input_snapshot,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
            )
