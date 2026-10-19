"""Unit tests for the LLM provider routing (``get_llm_client``).

Covers:
- :func:`init_chat_model` routing for direct providers
- OpenRouter portal routing
- Guard: every routed provider's langchain lib must be importable

``init_chat_model`` (the LangChain boundary) is replaced by a recording spy:
the tests assert the observable routing (which provider/args the boundary
receives) instead of mocking call interactions.
"""

from __future__ import annotations

import importlib
from typing import Any

import pytest

from app.shared.llm_gateway.client import providers as providers_module
from app.shared.llm_gateway.client.providers import get_llm_client

_FAKE_API_KEY = "sk-test-key"  # pragma: allowlist secret

# Langchain integration packages that must be installed for the routes we use.
# Add a new entry whenever a new provider route is added to providers.py.
_REQUIRED_LANGCHAIN_MODULES: tuple[str, ...] = (
    "langchain_openai",
    "langchain_anthropic",
    "langchain_ollama",
    "langchain_mistralai",
    "langchain_google_genai",
    "langchain_cohere",
    "langchain_deepseek",
)


class _InitChatModelSpy:
    """Recording boundary spy for ``init_chat_model``.

    Captures the routed model identifier and keyword arguments and returns
    itself, so a test can assert on the observable routing of
    :func:`get_llm_client` without mocking call interactions.
    """

    def __init__(self) -> None:
        self.model: str | None = None
        self.kwargs: dict[str, Any] = {}

    def __call__(self, model: str, **kwargs: Any) -> _InitChatModelSpy:
        """Record the routed model + kwargs and return ``self``."""
        self.model = model
        self.kwargs = kwargs
        return self

    @property
    def model_provider(self) -> str:
        """Return the routed LangChain provider string."""
        return self.kwargs["model_provider"]


@pytest.fixture
def init_spy(monkeypatch: pytest.MonkeyPatch) -> _InitChatModelSpy:
    """Replace the LangChain ``init_chat_model`` boundary with a recording spy."""
    spy = _InitChatModelSpy()
    monkeypatch.setattr(providers_module, "init_chat_model", spy)
    return spy


class TestGetLLMClientDirectRouting:
    @pytest.mark.unit
    def test_gpt_model_uses_openai_provider(self, init_spy: _InitChatModelSpy) -> None:
        """A ``gpt-`` model routes to the OpenAI provider with the given key."""
        result = get_llm_client("gpt-4o-mini", _FAKE_API_KEY)

        assert result is init_spy
        assert init_spy.model == "gpt-4o-mini"
        assert init_spy.model_provider == "openai"
        assert init_spy.kwargs["api_key"] == _FAKE_API_KEY

    @pytest.mark.unit
    def test_claude_model_uses_anthropic_provider(self, init_spy: _InitChatModelSpy) -> None:
        """A ``claude-`` model routes to the Anthropic provider."""
        get_llm_client("claude-haiku-3-5", _FAKE_API_KEY)

        assert init_spy.model == "claude-haiku-3-5"
        assert init_spy.model_provider == "anthropic"

    @pytest.mark.unit
    def test_ollama_model_uses_ollama_provider(self, init_spy: _InitChatModelSpy) -> None:
        """An ``ollama/`` model routes to the Ollama provider without an API key."""
        get_llm_client("ollama/llama3", "")

        assert init_spy.model == "ollama/llama3"
        assert init_spy.model_provider == "ollama"
        assert "api_key" not in init_spy.kwargs

    @pytest.mark.unit
    def test_deepseek_model_uses_deepseek_provider(self, init_spy: _InitChatModelSpy) -> None:
        """A ``deepseek-`` model routes to the DeepSeek provider."""
        get_llm_client("deepseek-v4-pro", _FAKE_API_KEY)

        assert init_spy.model == "deepseek-v4-pro"
        assert init_spy.model_provider == "deepseek"

    @pytest.mark.unit
    def test_deepseek_with_extra_body_disables_thinking(self, init_spy: _InitChatModelSpy) -> None:
        """An explicit ``extra_body`` is forwarded to the model boundary."""
        extra_body = {"thinking": {"type": "disabled"}}

        get_llm_client("deepseek-v4-pro", _FAKE_API_KEY, extra_body=extra_body)

        assert init_spy.kwargs["extra_body"] == extra_body

    @pytest.mark.unit
    def test_unsupported_prefix_raises_value_error(self) -> None:
        """A model with an unknown prefix raises a ``ValueError``."""
        with pytest.raises(ValueError, match="Cannot infer provider"):
            get_llm_client("unknown/model", _FAKE_API_KEY)


class TestGetLLMClientOpenRouterPortal:
    @pytest.mark.unit
    def test_openrouter_portal_uses_openai_provider_with_base_url(self, init_spy: _InitChatModelSpy) -> None:
        """The OpenRouter portal routes to OpenAI with the OpenRouter base URL."""
        get_llm_client("deepseek/deepseek-v4-pro", _FAKE_API_KEY, portal="openrouter")

        assert init_spy.model == "deepseek/deepseek-v4-pro"
        assert init_spy.model_provider == "openai"
        assert init_spy.kwargs["base_url"] == "https://openrouter.ai/api/v1"

    @pytest.mark.unit
    def test_openrouter_portal_requires_api_key(self) -> None:
        """The OpenRouter portal without an API key raises a ``ValueError``."""
        with pytest.raises(ValueError, match="API key required"):
            get_llm_client("deepseek/deepseek-v4-pro", None, portal="openrouter")


@pytest.mark.parametrize("module_name", _REQUIRED_LANGCHAIN_MODULES)
@pytest.mark.unit
def test_provider_langchain_lib_importable(module_name: str) -> None:
    """Every langchain integration package used by a route must be importable.

    Fails when a package is referenced in providers.py but not installed.
    """
    try:
        importlib.import_module(module_name)
    except ModuleNotFoundError:
        pytest.fail(
            f"Langchain lib '{module_name}' is not installed. Please add it to pyproject.toml and run `uv sync`."
        )
