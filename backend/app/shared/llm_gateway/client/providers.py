"""LLM provider detection and LangChain client instantiation.

Uses :func:`langchain.chat_models.init_chat_model` as the unified interface
for all providers – no manual class instantiation or prefix-matcher dispatch.

OpenAI-compatible providers (xiaomi, groq, xai, together, …) all route
through ``langchain-openai`` with a custom ``base_url``. Only providers with
non-OpenAI-compatible protocols use their own dedicated package.
"""

from __future__ import annotations

import importlib
from typing import Any

from langchain.chat_models import init_chat_model
from langchain_core.language_models.chat_models import BaseChatModel
from langfuse import observe

_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

#: Providers whose LangChain chat class accepts a top-level ``seed`` argument.
#: ``seed`` is silently dropped for all others to avoid an init error.
_SEED_SUPPORTED_PROVIDERS: frozenset[str] = frozenset({"openai"})

#: Providers that use ``langchain-openai`` (OpenAI-compatible protocol) with
#: a custom ``base_url``. All other providers either have their own LangChain
#: package or use the default OpenAI base URL.
_OPENAI_COMPAT_PROVIDERS: frozenset[str] = frozenset(
    {
        "xiaomi",
        "groq",
        "xai",
        "together",
        "fireworks",
        "perplexity",
    }
)


def _provider_package(provider: str) -> str:
    """Derive the LangChain integration package name from a provider string.

    Args:
        provider: An :func:`init_chat_model` provider string.

    Returns:
        The dotted Python package name, e.g. ``"langchain_openai"``.
    """
    if provider in _OPENAI_COMPAT_PROVIDERS:
        return "langchain_openai"
    return f"langchain_{provider}"


def _require_key(model: str, api_key: str | None) -> str:
    """Return the api_key or raise if missing."""
    if not api_key:
        raise ValueError(f"API key required for model '{model}'")
    return api_key


def _infer_provider(model: str) -> str:
    """Map a model identifier prefix to an :func:`init_chat_model` provider string.

    The provider string selects the underlying LangChain integration package.
    OpenAI-compatible providers return ``"openai"`` and require a ``base_url``
    to be passed to :func:`init_chat_model`.

    Args:
        model: Native or composite model ID (e.g. ``"deepseek-v4-pro"``).

    Returns:
        Provider string accepted by :func:`init_chat_model`.
    """
    if model.startswith(("xiaomi/", "groq/", "xai/", "together/", "fireworks/", "perplexity/")):
        return "openai"
    if model.startswith("deepseek-"):
        return "deepseek"
    if model.startswith(("gpt-", "o1", "o3")):
        return "openai"
    if model.startswith("claude-"):
        return "anthropic"
    if model.startswith("gemini-"):
        return "google_genai"
    if model.startswith(("mistral-", "codestral-", "open-mistral-", "open-mixtral-")):
        return "mistralai"
    if model.startswith(("command-", "c4ai-")):
        return "cohere"
    if model.startswith("ollama/"):
        return "ollama"
    raise ValueError(f"Cannot infer provider for model: '{model}'")


def is_provider_installed(provider: str) -> bool:
    """Check whether the LangChain integration package for *provider* is importable."""
    pkg = _provider_package(provider)
    try:
        importlib.import_module(pkg)
        return True
    except ModuleNotFoundError:
        return False


def _ensure_provider_installed(provider: str) -> None:
    """Raise :class:`ValueError` if *provider*'s package is not installed."""
    if not is_provider_installed(provider):
        pkg = _provider_package(provider)
        raise ValueError(
            f"Provider '{provider}' ist nicht installiert. "
            f"Bitte '{pkg}' zu pyproject.toml hinzufügen und `uv sync` ausführen."
        )


@observe(name="llm-client-init")
def get_llm_client(
    model: str,
    api_key: str | None = None,
    *,
    portal: str | None = None,
    base_url: str | None = None,
    extra_body: dict[str, object] | None = None,
    model_kwargs: dict[str, Any] | None = None,
) -> BaseChatModel:
    """Return a LangChain BaseChatModel via :func:`init_chat_model`.

    Routing is determined by *portal*:
    - ``"openrouter"`` → ``model_provider="openai"`` with OpenRouter's base URL.
    - ``"direct"`` / ``None`` → provider inferred from model prefix, calls
      the provider's native API directly.

    For OpenAI-compatible direct providers (xiaomi, groq, …), pass the
    provider's ``api_base`` as *base_url*.

    Args:
        model: Model identifier (native or OpenRouter path).
        api_key: Provider API key. Required except for Ollama.
        portal: Credential portal type from ``admin_credential.portal``.
        base_url: Optional custom base URL for OpenAI-compatible providers.
        extra_body: Optional dict added to the request body (e.g.
            ``{"thinking": {"type": "disabled"}}`` for DeepSeek V4).
        model_kwargs: Optional sampling parameters passed through to the model
            class (e.g. ``{"temperature": 0.0, "seed": 42}``).

    Returns:
        A configured ``BaseChatModel`` instance.
    """
    model_kwargs = model_kwargs or {}
    if portal == "openrouter":
        return init_chat_model(
            model,
            model_provider="openai",
            api_key=_require_key(model, api_key),
            base_url=_OPENROUTER_BASE_URL,
            **model_kwargs,
        )

    # Direct portal: infer provider from model prefix.
    provider = _infer_provider(model)
    _ensure_provider_installed(provider)
    if provider not in _SEED_SUPPORTED_PROVIDERS:
        model_kwargs = {k: v for k, v in model_kwargs.items() if k != "seed"}
    kwargs: dict[str, Any] = {}
    if api_key:
        kwargs["api_key"] = api_key
    if base_url:
        kwargs["base_url"] = base_url
    if extra_body:
        kwargs["extra_body"] = extra_body
    kwargs.update(model_kwargs)
    return init_chat_model(model, model_provider=provider, **kwargs)
