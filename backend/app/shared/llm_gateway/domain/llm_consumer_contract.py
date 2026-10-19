"""Reusable mixin for gates/services that consume an injected LLM client factory.

Every factory-backed gate and service stores its injected factory under
``_llm_client_factory``. That one-line ``__init__`` was duplicated across the
gates (``ci_obs``, ``eval_gates``) and the task executor; this mixin is the
single source of truth for it.
"""

from __future__ import annotations

from collections.abc import Callable

from app.shared.llm_gateway.client.client import LLMClient


class LLMClientFactoryConsumer:
    """Mixin storing an injected ``task_key -> LLMClient`` factory as ``_llm_client_factory``.

    Attributes:
        _llm_client_factory: Callable resolving a task key to an ``LLMClient``.
    """

    _llm_client_factory: Callable[[str], LLMClient]

    def __init__(self, llm_client_factory: Callable[[str], LLMClient]) -> None:
        """Store the injected factory.

        Args:
            llm_client_factory: Callable resolving a task key to an ``LLMClient``.
        """
        self._llm_client_factory = llm_client_factory
