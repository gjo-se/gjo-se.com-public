"""Resolved parameters for a single LLM invocation.

The immutable value produced by resolution (mapping → model → credential →
prompt); consumed by the call lifecycle and by the inline call-log writer.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage


@dataclass(frozen=True)
class _PreparedCall:
    """Resolved parameters for an LLM invocation.

    Attributes:
        messages: Ready-to-send system/user messages with filled placeholders.
        model_identifier: Model ID passed to the provider factory
            (``openrouter_id`` for the OpenRouter portal, else ``native_model_id``).
        api_key: Decrypted API key for the resolved credential.
        portal: Credential portal type (e.g. ``"openrouter"``, ``"direct"``).
        base_url: Optional custom base URL for OpenAI-compatible providers.
        credential_service: Credential service label (for logging).
        prompt_version: Active prompt template version (for logging).
        has_reasoning: Whether the model has reasoning/thinking capability.
        output_mode: ``"structured"`` or ``"text"`` from the use-case registry.
        model_kwargs: Whitelisted sampling parameters (temperature, seed, …)
            forwarded to the model class.
        disable_thinking: Whether the task explicitly requests reasoning off
            (``reasoning: off`` in the task-model config), so the provider's
            native thinking mode must be disabled for this call.
    """

    messages: list[HumanMessage | SystemMessage]
    model_identifier: str
    api_key: str
    portal: str | None
    base_url: str | None
    credential_service: str
    prompt_version: int
    has_reasoning: bool
    output_mode: str
    model_kwargs: dict[str, object]
    input_snapshot: dict[str, Any]
    """Captured input for reproducible retry (INC 2). Contains ``variables``,
    ``prompt_version``, ``output_schema``, ``call_type``, ``portal``. No API key."""
    disable_thinking: bool = False
