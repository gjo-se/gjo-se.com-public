"""Code-side registry of supported LLM providers.

A provider is *supported* (Stufe 2 in the 3-tier readiness model) when:
  1. It has an entry in ``PROVIDER_REGISTRY``.
  2. Its langchain integration package is importable.

Example:
    >>> from app.shared.llm_gateway.services.provider_registry_service import is_supported
    >>> is_supported("openai")
    True
"""

from __future__ import annotations

import importlib
from dataclasses import dataclass

import structlog

logger = structlog.get_logger(__name__)


@dataclass(frozen=True)
class ProviderSpec:
    """Specification for a supported LLM provider.

    Attributes:
        package: Pip-package name that must be importable, e.g.
            ``'langchain_openai'``.
        needs_key: ``True`` if the provider requires a user-supplied API key.
            ``False`` for local providers like Ollama.
    """

    package: str
    needs_key: bool  # pragma: allowlist secret


# Maps provider name (as used in OpenRouter IDs) to its code spec.
PROVIDER_REGISTRY: dict[str, ProviderSpec] = {
    "openai": ProviderSpec(package="langchain_openai", needs_key=True),  # pragma: allowlist secret
    "anthropic": ProviderSpec(package="langchain_anthropic", needs_key=True),  # pragma: allowlist secret
    "google": ProviderSpec(package="langchain_google_genai", needs_key=True),  # pragma: allowlist secret
    "mistralai": ProviderSpec(package="langchain_mistralai", needs_key=True),  # pragma: allowlist secret
    "cohere": ProviderSpec(package="langchain_cohere", needs_key=True),  # pragma: allowlist secret
    "ollama": ProviderSpec(package="langchain_ollama", needs_key=False),  # pragma: allowlist secret
}

# Human-readable display names for auto-created provider rows.
PROVIDER_DISPLAY_NAMES: dict[str, str] = {
    "openai": "OpenAI",
    "anthropic": "Anthropic",
    "google": "Google DeepMind",
    "mistralai": "Mistral AI",
    "cohere": "Cohere",
    "ollama": "Ollama (lokal)",
}


def is_supported(provider_name: str) -> bool:
    """Return True if the provider has code implementation and package is importable.

    Checks :data:`PROVIDER_REGISTRY` for the spec, then attempts to import
    the declared package.  Import errors are logged but do not raise.

    Args:
        provider_name: The provider identifier, e.g. ``'openai'``.

    Returns:
        ``True`` if both the registry entry and the package exist.
    """
    spec = PROVIDER_REGISTRY.get(provider_name)
    if spec is None:
        return False
    try:
        _ = importlib.import_module(spec.package)
        return True
    except ImportError:
        logger.debug(
            "Provider '%s' registered but package '%s' not importable.",
            provider_name,
            spec.package,
        )
        return False
