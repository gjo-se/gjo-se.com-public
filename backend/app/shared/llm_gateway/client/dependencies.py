"""Composition-root providers for the low-level LLM client."""

from __future__ import annotations

from collections.abc import Callable

from app.shared.llm_gateway.client.client import LLMClient


def get_llm_client_factory() -> Callable[[str], LLMClient]:
    """Provide the :class:`LLMClient` factory (``model`` → client).

    Wiring point for the low-level LLM client; consumers (executor, gates,
    description merge) receive the factory and build clients per call.
    """
    return LLMClient
