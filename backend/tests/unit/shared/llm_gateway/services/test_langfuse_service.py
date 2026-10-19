"""Unit tests for the LangFuse service wrapper's graceful degradation."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.shared.llm_gateway.services import langfuse_service as langfuse_service_module
from app.shared.llm_gateway.services.langfuse_service import LangfuseService


@pytest.fixture()
def unconfigured(monkeypatch: pytest.MonkeyPatch) -> None:
    """Patch an unconfigured (None) LangFuse client into the wrapper."""
    monkeypatch.setattr(langfuse_service_module, "get_langfuse_client", lambda: None)


@pytest.fixture()
def configured(monkeypatch: pytest.MonkeyPatch) -> SimpleNamespace:
    """Patch a working fake LangFuse client into the wrapper."""
    client = SimpleNamespace(
        create_dataset=lambda **_kwargs: None,
        create_score=lambda **_kwargs: None,
        get_prompt=lambda **_kwargs: "prompt text",
    )
    monkeypatch.setattr(langfuse_service_module, "get_langfuse_client", lambda: client)
    return client


@pytest.mark.unit
async def test_create_dataset_skips_without_client(unconfigured: None) -> None:
    """An unconfigured client yields None instead of raising."""
    assert await LangfuseService().create_dataset("t") is None


@pytest.mark.unit
async def test_create_score_returns_false_without_client(unconfigured: None) -> None:
    """An unconfigured client reports the score as not written."""
    assert await LangfuseService().create_score(trace_id="t", name="n", value=1.0) is False


@pytest.mark.unit
async def test_create_dataset_returns_info_with_configured_client(configured: SimpleNamespace) -> None:
    """A configured client returns the created dataset info."""
    result = await LangfuseService().create_dataset("description-merge", description="golden")

    assert result == {"name": "description-merge", "description": "golden"}


@pytest.mark.unit
async def test_get_prompt_returns_text_with_configured_client(configured: SimpleNamespace) -> None:
    """A configured client returns the prompt text and label."""
    result = await LangfuseService().get_prompt("description-merge", label="production")

    assert result == {"name": "description-merge", "label": "production", "prompt": "prompt text"}


@pytest.mark.unit
async def test_get_prompt_returns_none_when_underlying_client_raises(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A failing underlying client is swallowed and reported as None."""

    def _raise(**_kwargs: object) -> str:
        raise RuntimeError("boom")

    monkeypatch.setattr(
        langfuse_service_module,
        "get_langfuse_client",
        lambda: SimpleNamespace(get_prompt=_raise),
    )

    assert await LangfuseService().get_prompt("x") is None
