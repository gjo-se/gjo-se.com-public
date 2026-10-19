"""Direct HTTP client – raw API call without DB/tracing overhead.

Used by :class:`EvaluationService` to measure the direct provider latency
against the full LangChain/DB/Tracing stack.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any

import httpx
import structlog

logger = structlog.get_logger(__name__)

_CHAT_COMPLETIONS_PATH = "/chat/completions"
_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


@dataclass(frozen=True)
class DirectResult:
    """Result of a direct provider API call.

    Attributes:
        duration_ms: Wall-clock duration of the HTTP call in milliseconds.
        response_text: The model's text response.
        token_count: Total token count if returned by the API, or ``None``.
    """

    duration_ms: int
    response_text: str
    token_count: int | None


class DirectLlmInvoker:
    """Makes a direct provider API call bypassing LangChain and DB layers.

    Used exclusively by Gate 2 to measure the raw provider latency.
    Instances are cheap – the underlying :class:`httpx.AsyncClient` is
    created per call with a short timeout.

    Usage::

        from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_direct_client

        result = await get_direct_client().call(
            messages=[{"role": "user", "content": "Hello"}],
            model_identifier="deepseek/deepseek-v4-pro",
            api_key="sk-...",  # pragma: allowlist secret
        )
    """

    async def call(
        self,
        *,
        messages: list[dict[str, str]],
        model_identifier: str,
        api_key: str,
        portal: str | None = None,
        api_base: str | None = None,
    ) -> DirectResult:
        """Execute a single chat-completion request directly against the provider.

        Args:
            messages: OpenAI-format message list
                (``[{"role": "user", "content": "..."}]``).
            model_identifier: Model ID (OpenRouter path or native ID).
            api_key: Provider API key.
            portal: ``"openrouter"`` or ``None`` (direct).
            api_base: Base URL for direct provider calls. Required when
                *portal* is not ``"openrouter"``. Falls back to OpenRouter
                if omitted.

        Returns:
            :class:`DirectResult` with duration, text, and token count.
        """
        if portal == "openrouter":
            url = f"{_OPENROUTER_BASE_URL}{_CHAT_COMPLETIONS_PATH}"
        elif api_base:
            url = f"{api_base}{_CHAT_COMPLETIONS_PATH}"
        else:
            logger.warning("direct_client: no api_base for direct call, falling back to OpenRouter")
            url = f"{_OPENROUTER_BASE_URL}{_CHAT_COMPLETIONS_PATH}"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": model_identifier,
            "messages": messages,
        }

        started = time.monotonic()
        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
        elapsed_ms = int((time.monotonic() - started) * 1000)

        choices = data.get("choices", [])
        response_text = ""
        if choices:
            response_text = choices[0].get("message", {}).get("content", "") or ""

        usage = data.get("usage")
        token_count: int | None = None
        if usage:
            token_count = usage.get("total_tokens")

        logger.debug(
            "direct_client: call completed – duration=%dms tokens=%s",
            elapsed_ms,
            token_count,
        )
        return DirectResult(
            duration_ms=elapsed_ms,
            response_text=response_text,
            token_count=token_count,
        )
