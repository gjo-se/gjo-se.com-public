"""Unit tests for the LangFuse-backed prompt service."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.shared.llm_gateway import langfuse_client as langfuse_client_module
from app.shared.llm_gateway.exceptions import LangfuseUnreachableError
from app.shared.llm_gateway.services.prompt_service import (
    PromptData,
    PromptService,
    _langfuse_prompt_to_template,
)


def _sentinel_client() -> object:
    """Return a non-None placeholder standing in for a configured client."""
    return object()


@pytest.fixture()
def healthy_langfuse(monkeypatch: pytest.MonkeyPatch) -> SimpleNamespace:
    """Patch a configured+healthy LangFuse client into the prompt service."""
    client = SimpleNamespace(
        get_prompt=lambda **_kwargs: SimpleNamespace(
            prompt="Hello {name}",
            version=3,
            labels=["production"],
            config={"system_prompt": "Sys", "placeholders": ["name"]},
        ),
    )
    monkeypatch.setattr(langfuse_client_module, "get_langfuse_client", lambda: client)
    monkeypatch.setattr(langfuse_client_module, "is_langfuse_healthy", lambda: True)
    return client


@pytest.mark.unit
async def test_get_active_prompt_returns_none_when_langfuse_not_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Without a LangFuse client the service degrades to None."""
    monkeypatch.setattr(langfuse_client_module, "get_langfuse_client", lambda: None)

    assert await PromptService().get_active_prompt("description-merge") is None


@pytest.mark.unit
async def test_get_active_prompt_maps_production_label_to_active_template(
    healthy_langfuse: SimpleNamespace,
) -> None:
    """A production-labelled prompt becomes an active template with its version."""
    template = await PromptService().get_active_prompt("description-merge")

    assert template is not None
    assert template.user_prompt == "Hello {name}"
    assert template.system_prompt == "Sys"
    assert template.version == 3
    assert template.active is True


@pytest.mark.unit
async def test_get_active_prompt_raises_when_langfuse_unhealthy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A configured but unreachable LangFuse surfaces as LangfuseUnreachableError."""
    monkeypatch.setattr(langfuse_client_module, "get_langfuse_client", _sentinel_client)
    monkeypatch.setattr(langfuse_client_module, "is_langfuse_healthy", lambda: False)

    with pytest.raises(LangfuseUnreachableError):
        await PromptService().get_active_prompt("description-merge")


@pytest.mark.unit
async def test_create_version_returns_none_without_langfuse(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Creating a version is a no-op when LangFuse is not configured."""
    monkeypatch.setattr(langfuse_client_module, "get_langfuse_client", lambda: None)

    result = await PromptService().create_version(
        "description-merge",
        PromptData(system_prompt=None, user_prompt="x"),
    )

    assert result is None


@pytest.mark.unit
def test_prompt_to_template_marks_non_production_prompt_inactive() -> None:
    """A prompt without the production label maps to an inactive template."""
    prompt = SimpleNamespace(prompt="p", version=1, labels=["latest"], config={})

    template = _langfuse_prompt_to_template("task", prompt)

    assert template.active is False
    assert template.placeholders is None
