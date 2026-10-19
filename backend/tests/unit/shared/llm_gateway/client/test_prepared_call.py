"""Unit tests for the immutable resolved-call value object."""

from __future__ import annotations

import dataclasses

import pytest
from langchain_core.messages import HumanMessage

from app.shared.llm_gateway.client.prepared_call import _PreparedCall

pytestmark = pytest.mark.unit


def _prepared_call(model_identifier: str = "gpt-4o") -> _PreparedCall:
    """Build a fully populated prepared call for value-object assertions."""
    return _PreparedCall(
        messages=[HumanMessage(content="hello")],
        model_identifier=model_identifier,
        api_key="abcdefghijklmnop",
        portal="direct",
        base_url="https://api.example.com/v1",
        credential_service="direct:openai:1",
        prompt_version=2,
        has_reasoning=True,
        output_mode="structured",
        model_kwargs={"temperature": 0.2},
        input_snapshot={"variables": {"name": "Ada"}, "portal": "direct"},
    )


def test_prepared_call_exposes_all_resolved_parameters() -> None:
    """Every resolved parameter is retained on the value object."""
    prepared = _prepared_call()

    assert prepared.model_identifier == "gpt-4o"
    assert prepared.api_key == "abcdefghijklmnop"
    assert prepared.portal == "direct"
    assert prepared.base_url == "https://api.example.com/v1"
    assert prepared.credential_service == "direct:openai:1"
    assert prepared.prompt_version == 2
    assert prepared.has_reasoning is True
    assert prepared.output_mode == "structured"
    assert prepared.model_kwargs == {"temperature": 0.2}
    assert prepared.input_snapshot == {"variables": {"name": "Ada"}, "portal": "direct"}
    assert len(prepared.messages) == 1


def test_prepared_call_is_immutable_after_construction() -> None:
    """The resolved call cannot be mutated after construction."""
    prepared = _prepared_call()

    with pytest.raises(dataclasses.FrozenInstanceError):
        prepared.model_identifier = "other-model"


def test_prepared_call_equality_depends_on_every_field() -> None:
    """Two prepared calls are equal only when all fields match."""
    assert _prepared_call() == _prepared_call()
    assert _prepared_call(model_identifier="gpt-4o") != _prepared_call(model_identifier="other-model")
