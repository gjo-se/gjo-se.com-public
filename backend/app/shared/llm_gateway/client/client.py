"""Provider-agnostic LLM client with structured output and retry.

Stable public surface for the low-level LLM client. The implementation is split
into focused sibling modules – :mod:`errors` (classification),
:mod:`resolution` (mapping → model → credential → prompt),
:mod:`invocation` (structured-output runnable), :mod:`response` (raw-response
normalisation) and :mod:`lifecycle` (prepare/log/invoke skeleton) – while this
module keeps :class:`LLMClient` and re-exports the public helpers so consumer
imports stay stable.
"""

from __future__ import annotations

import time
from collections.abc import AsyncIterator
from typing import Any

import structlog
from langfuse import observe
from langfuse.langchain import CallbackHandler as LangfuseCallbackHandler
from pydantic import BaseModel, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import RetryError

from app.shared.llm_gateway.client.errors import classify_exception, friendly_error_message
from app.shared.llm_gateway.client.factory import LLMClientFactoryMixin
from app.shared.llm_gateway.client.invocation import build_chat_llm, build_invoke_config, build_structured_llm
from app.shared.llm_gateway.client.lifecycle import LLMCallLifecycleMixin, _UsageSink
from app.shared.llm_gateway.client.prepared_call import _PreparedCall
from app.shared.llm_gateway.client.resolution import resolve_call
from app.shared.llm_gateway.client.response import chunk_to_text, extract_usage
from app.shared.llm_gateway.client.retry import with_llm_retry
from app.shared.llm_gateway.exceptions import LLMCallError, LLMValidationError
from app.shared.llm_gateway.models.call_log import CallType

__all__ = ["LLMClient", "classify_exception", "friendly_error_message"]

_logger = structlog.get_logger(__name__)


class LLMClient(LLMClientFactoryMixin, LLMCallLifecycleMixin):
    """Provider-agnostic LLM client.

    Wraps a LangChain ``BaseChatModel`` with structured output validation
    and transparent retry logic for transient provider errors.

    Use the async factory :meth:`from_db` (provided by
    :class:`~app.shared.llm_gateway.client.factory.LLMClientFactoryMixin`) to
    create a client with the API key loaded automatically from the database.

    Args:
        model: Model identifier (e.g. ``"gpt-4o-mini"``).
    """

    def __init__(self, model: str) -> None:
        self._model = model
        self._call_log_id: int | None = None

    # ── Resolution ──────────────────────────────────────────────────────────

    @observe(name="llm-prepare")
    async def _prepare(
        self,
        db: AsyncSession,
        task: str,
        variables: dict[str, str],
        *,
        force_model_id: int | None = None,
        force_credential_id: int | None = None,
        hyperparameters: dict[str, Any] | None = None,
    ) -> _PreparedCall:
        """Resolve mapping → model → credential → prompt and build messages.

        Thin wrapper over :func:`~app.shared.llm_gateway.client.resolution.resolve_call`
        kept on the client so inline callers (gates, diagnose) can reuse the
        resolution flow directly.

        Args:
            db: Active async database session.
            task: Task identifier (e.g. ``"description-merge"``).
            variables: Dict of placeholder values to fill into the prompt template.
            force_model_id: Optional model id override (fallback after primary failure).
            force_credential_id: Optional credential id override for the forced model.
            hyperparameters: Optional sampling-parameter override.

        Returns:
            A :class:`_PreparedCall` with messages, model identifier, key, portal.
        """
        return await resolve_call(
            db,
            task,
            variables,
            force_model_id=force_model_id,
            force_credential_id=force_credential_id,
            hyperparameters=hyperparameters,
        )

    # ── Call (structured output) ────────────────────────────────────────────

    async def call[T: BaseModel](
        self,
        db: AsyncSession,
        task: str,
        variables: dict[str, str],
        output_schema: type[T],
        *,
        project_id: int | None = None,
        trigger: str | None = None,
        phase: str | None = None,
        force_model_id: int | None = None,
        force_credential_id: int | None = None,
        hyperparameters: dict[str, Any] | None = None,
    ) -> T:
        """Invoke the LLM and return a Pydantic-validated response.

        Use for machine-consumed data extraction where every field maps
        cleanly to a JSON value. **Do not** use for free-form Markdown or
        long prose — JSON string encoding of such content is unreliable
        across models (newlines get flattened). Use :meth:`call_text` instead.

        Internally applies tenacity retry for transient provider errors
        (max 2 retries, exponential back-off 1 s / 2 s). Every outcome
        (success or failure) writes exactly one ``llm_call_log`` row.

        Args:
            db: Active async database session.
            task: Task identifier (e.g. ``"description-merge"``).
            variables: Dict of placeholder values to fill into the prompt template.
            output_schema: Pydantic model class that defines the expected output.
            project_id: Optional originating project id (call-log context).
            trigger: Optional trigger label (call-log context).
            phase: Optional pipeline phase (call-log context).
            force_model_id: Optional model id override (fallback after primary failure).
            force_credential_id: Optional credential id override for the forced model.
            hyperparameters: Optional sampling-parameter override.

        Returns:
            A validated instance of ``output_schema``.

        Raises:
            NoModelForTaskError: Unknown use case or no active mapping.
            LLMModelDisabledError: The mapped model is inactive.
            NoCredentialForTaskError: No valid credential for the resolved mapping.
            NoPromptForTaskError: No active prompt template for task.
            PromptVariableMissingError: Required placeholder variable missing.
            LLMValidationError: If the LLM response does not match ``output_schema``.
            LLMCallError: If all retries are exhausted or an unrecoverable error occurs.
        """

        async def _invoke(
            prepared: _PreparedCall,
            langfuse_handler: LangfuseCallbackHandler,
            usage: _UsageSink,
        ) -> T:
            """Build the structured runnable and invoke it with retry + schema validation."""
            structured_llm = build_structured_llm(prepared, output_schema)

            _logger.info(
                "LLMClient.call: resolved task '%s' → model %s, credential %s, prompt v%d",
                task,
                prepared.model_identifier,
                prepared.credential_service,
                prepared.prompt_version,
            )

            @with_llm_retry
            async def _do() -> T:
                """Invoke the structured LLM with retry logic and validate the output schema."""
                result = await structured_llm.ainvoke(
                    prepared.messages,  # type: ignore[arg-type]
                    config=build_invoke_config(
                        langfuse_handler, project_id, trigger, task, prepared.model_identifier, prepared.portal
                    ),
                )
                # include_raw=True returns a dict with keys "raw" (AIMessage),
                # "parsed" (schema instance or None) and "parsing_error".
                raw = result["raw"] if isinstance(result, dict) else result
                usage.value = extract_usage(raw)
                parsed = result["parsed"] if isinstance(result, dict) else result
                if parsed is None or (isinstance(result, dict) and result.get("parsing_error")):
                    raise LLMValidationError(f"LLM output does not match schema '{output_schema.__name__}'")
                return parsed  # type: ignore[return-value]

            try:
                return await _do()
            except ValidationError as exc:
                raise LLMValidationError(f"Schema validation failed for '{output_schema.__name__}': {exc}") from exc
            except LLMValidationError:
                raise
            except RetryError as exc:
                last = exc.last_attempt.exception()
                _logger.error("LLM call failed after all retries: %s", last)
                raise LLMCallError(f"LLM call failed after all retries: {last}") from exc
            except Exception as exc:
                _logger.error("LLM call failed: %s", exc)
                raise LLMCallError(f"LLM call failed: {exc}") from exc

        return await self._run_request(
            db=db,
            task=task,
            variables=variables,
            call_type=CallType.STRUCTURED,
            prepare=lambda: self._prepare(
                db,
                task,
                variables,
                force_model_id=force_model_id,
                force_credential_id=force_credential_id,
                hyperparameters=hyperparameters,
            ),
            invoke=_invoke,
            to_output=lambda result: result.model_dump_json() if hasattr(result, "model_dump_json") else str(result),
            project_id=project_id,
            trigger=trigger,
            phase=phase,
        )

    # ── Call (free-form text) ───────────────────────────────────────────────

    async def call_text(
        self,
        db: AsyncSession,
        task: str,
        variables: dict[str, str],
        *,
        project_id: int | None = None,
        trigger: str | None = None,
        phase: str | None = None,
        force_model_id: int | None = None,
        force_credential_id: int | None = None,
        hyperparameters: dict[str, Any] | None = None,
    ) -> str:
        """Invoke the LLM and return the raw text response.

        Use for free-form Markdown or long prose. Unlike :meth:`call`, the
        content is **not** wrapped in a JSON schema, so newlines and Markdown
        structure are preserved exactly as the model emits them.

        Internally applies tenacity retry for transient provider errors
        (max 2 retries, exponential back-off 1 s / 2 s). Uses the same
        Mapping → Model → Credential → Prompt resolution as :meth:`call`.
        Every outcome (success or failure) writes exactly one ``llm_call_log`` row.

        Args:
            db: Active async database session.
            task: Task identifier (e.g. ``"description-merge"``).
            variables: Dict of placeholder values to fill into the prompt template.
            project_id: Optional originating project id (call-log context).
            trigger: Optional trigger label (call-log context).
            phase: Optional pipeline phase (call-log context).
            force_model_id: Optional model id override (fallback after primary failure).
            force_credential_id: Optional credential id override for the forced model.
            hyperparameters: Optional sampling-parameter override.

        Returns:
            The model's response as a plain string (stripped of leading/trailing
            whitespace).

        Raises:
            NoModelForTaskError: Unknown use case or no active mapping.
            LLMModelDisabledError: The mapped model is inactive.
            NoCredentialForTaskError: No valid credential for the resolved mapping.
            NoPromptForTaskError: No active prompt template for task.
            PromptVariableMissingError: Required placeholder variable missing.
            LLMValidationError: If the response is empty.
            LLMCallError: If all retries are exhausted or an unrecoverable error occurs.
        """

        async def _invoke(
            prepared: _PreparedCall,
            langfuse_handler: LangfuseCallbackHandler,
            usage: _UsageSink,
        ) -> str:
            """Build the text runnable and invoke it with retry."""
            llm = build_chat_llm(prepared)

            _logger.info(
                "LLMClient.call_text: resolved task '%s' → model %s, credential %s, prompt v%d",
                task,
                prepared.model_identifier,
                prepared.credential_service,
                prepared.prompt_version,
            )

            @with_llm_retry
            async def _do() -> str:
                """Invoke the LLM with retry logic and return the text content."""
                result = await llm.ainvoke(
                    prepared.messages,  # type: ignore[union-attr]
                    config=build_invoke_config(
                        langfuse_handler, project_id, trigger, task, prepared.model_identifier, prepared.portal
                    ),
                )
                usage.value = extract_usage(result)
                text = chunk_to_text(result.content).strip()
                if not text:
                    raise LLMValidationError("LLM returned empty text response")
                return text

            try:
                return await _do()
            except LLMValidationError:
                raise
            except RetryError as exc:
                last = exc.last_attempt.exception()
                _logger.error("LLM call_text failed after all retries: %s", last)
                raise LLMCallError(f"LLM call failed after all retries: {last}") from exc
            except Exception as exc:
                _logger.error("LLM call_text failed: %s", exc)
                raise LLMCallError(f"LLM call failed: {exc}") from exc

        return await self._run_request(
            db=db,
            task=task,
            variables=variables,
            call_type=CallType.TEXT,
            prepare=lambda: self._prepare(
                db,
                task,
                variables,
                force_model_id=force_model_id,
                force_credential_id=force_credential_id,
                hyperparameters=hyperparameters,
            ),
            invoke=_invoke,
            to_output=lambda result: result,
            project_id=project_id,
            trigger=trigger,
            phase=phase,
        )

    # ── Call (free-form text, streamed) ─────────────────────────────────────

    async def call_text_stream(
        self,
        db: AsyncSession,
        task: str,
        variables: dict[str, str],
        *,
        project_id: int | None = None,
        trigger: str | None = None,
        phase: str | None = None,
    ) -> AsyncIterator[str]:
        """Stream the LLM's free-form text response chunk by chunk.

        Like :meth:`call_text`, but yields incremental text chunks as the model
        generates them (via LangChain ``astream``). No structured output, so
        newlines and Markdown structure are preserved. No retry is applied –
        a partial stream cannot be transparently retried; transient failures
        surface as :class:`LLMCallError`. Every outcome (success or failure)
        writes exactly one ``llm_call_log`` row.

        Args:
            db: Active async database session.
            task: Task identifier (e.g. ``"description-merge"``).
            variables: Dict of placeholder values to fill into the prompt template.
            project_id: Optional originating project id (call-log context).
            trigger: Optional trigger label (call-log context).
            phase: Optional pipeline phase (call-log context).

        Yields:
            Non-empty text chunks in generation order.

        Raises:
            NoModelForTaskError: Unknown use case or no active mapping.
            LLMModelDisabledError: The mapped model is inactive.
            NoCredentialForTaskError: No valid credential for the resolved mapping.
            NoPromptForTaskError: No active prompt template for task.
            PromptVariableMissingError: Required placeholder variable missing.
            LLMCallError: If the streaming call fails.
        """

        async def _stream(
            prepared: _PreparedCall,
            langfuse_handler: LangfuseCallbackHandler,
        ) -> AsyncIterator[str]:
            """Build the text runnable and stream it chunk by chunk."""
            llm = build_chat_llm(prepared)

            _logger.info(
                "LLMClient.call_text_stream: resolved task '%s' → model %s, credential %s, prompt v%d",
                task,
                prepared.model_identifier,
                prepared.credential_service,
                prepared.prompt_version,
            )

            try:
                async for chunk in llm.astream(
                    prepared.messages,
                    config=build_invoke_config(
                        langfuse_handler, project_id, trigger, task, prepared.model_identifier, prepared.portal
                    ),
                ):
                    text = chunk_to_text(chunk.content)
                    if text:
                        yield text
            except Exception as exc:
                _logger.error("LLM call_text_stream failed: %s", exc)
                raise LLMCallError(f"LLM streaming call failed: {exc}") from exc

        async for text in self._run_stream(
            db=db,
            task=task,
            variables=variables,
            call_type=CallType.STREAM,
            prepare=lambda: self._prepare(db, task, variables),
            stream=_stream,
            project_id=project_id,
            trigger=trigger,
            phase=phase,
        ):
            yield text

    async def resolve(
        self,
        db: AsyncSession,
        task: str,
        variables: dict[str, str],
        *,
        project_id: int | None = None,
        trigger: str | None = None,
        phase: str | None = None,
    ) -> None:
        """Run resolution eagerly (mapping → model → credential → prompt).

        Used as an up-front pre-check before starting a streaming response so a
        resolution failure can surface as an HTTP error instead of a broken
        stream. Discards the prepared call; raises the same resolution
        exceptions as :meth:`call`/:meth:`call_text`. A failure writes exactly
        one ``llm_call_log`` row (success writes none – the actual streamed call
        logs its own outcome).

        Args:
            db: Active async database session.
            task: Task identifier.
            variables: Placeholder values.
            project_id: Optional originating project id (call-log context).
            trigger: Optional trigger label (call-log context).
            phase: Optional pipeline phase (call-log context).

        Raises:
            NoModelForTaskError: Unknown use case or no active mapping.
            LLMModelDisabledError: The mapped model is inactive.
            NoCredentialForTaskError: No valid credential.
            NoPromptForTaskError: No active prompt template.
            PromptVariableMissingError: Required placeholder variable missing.
        """
        started = time.monotonic()
        try:
            await self._prepare(db, task, variables)
        except Exception as exc:
            await self._log_failure(
                exc,
                task,
                CallType.STREAM,
                None,
                project_id,
                trigger,
                started,
                phase,
                input_snapshot=None,
            )
            raise
