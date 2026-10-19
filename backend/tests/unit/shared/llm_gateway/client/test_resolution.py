"""Unit tests for the LLM call resolution helpers.

The prompt/kwargs/messages building blocks are pure functions; the
database-bound resolution flow is only asserted on its pre-DB guard.
"""

from __future__ import annotations

from typing import Any, cast

import pytest
from langchain_core.messages import HumanMessage, SystemMessage

from app.shared.llm_gateway.client.resolution import (
    _build_messages,
    _format_prompt,
    _resolve_model_kwargs,
    resolve_call,
)
from app.shared.llm_gateway.exceptions import NoModelForTaskError, PromptVariableMissingError
from app.shared.llm_gateway.services.prompt_service import PromptTemplate

pytestmark = pytest.mark.unit


async def test_resolve_call_raises_for_unknown_task() -> None:
    """An unregistered task is rejected before any database access."""
    with pytest.raises(NoModelForTaskError, match="Unknown task"):
        await resolve_call(cast(Any, None), "definitely-not-a-real-task", {})


def test_format_prompt_fills_named_placeholders() -> None:
    """All named placeholders are substituted into the template."""
    result = _format_prompt("Hello {name}, you are {role}", {"name": "Ada", "role": "admin"}, "task-x", "user_prompt")

    assert result == "Hello Ada, you are admin"


def test_format_prompt_raises_when_placeholder_missing() -> None:
    """A missing placeholder surfaces as a prompt-variable error naming the key."""
    with pytest.raises(PromptVariableMissingError, match="role"):
        _format_prompt("Hello {name} {role}", {"name": "Ada"}, "task-x", "user_prompt")


def test_build_messages_returns_system_then_user_when_system_present() -> None:
    """A system prompt becomes a leading SystemMessage, then the user message."""
    template = PromptTemplate(task="task-x", system_prompt="You are {persona}.", user_prompt="Do {action}.")

    messages = _build_messages(template, {"persona": "a helper", "action": "the thing"}, "task-x")

    assert [type(message) for message in messages] == [SystemMessage, HumanMessage]
    assert messages[0].content == "You are a helper."
    assert messages[1].content == "Do the thing."


def test_build_messages_omits_system_message_when_absent() -> None:
    """Without a system prompt only the user message is produced."""
    template = PromptTemplate(task="task-x", user_prompt="Do {action}.")

    messages = _build_messages(template, {"action": "the thing"}, "task-x")

    assert [type(message) for message in messages] == [HumanMessage]
    assert messages[0].content == "Do the thing."


def test_build_messages_raises_when_declared_placeholder_missing() -> None:
    """A declared-but-missing placeholder is rejected before formatting."""
    template = PromptTemplate(task="task-x", user_prompt="Do {action}.", placeholders='["action", "target"]')

    with pytest.raises(PromptVariableMissingError, match="target"):
        _build_messages(template, {"action": "the thing"}, "task-x")


def test_build_messages_ignores_undeclared_extra_variables() -> None:
    """Extra variables beyond the declared placeholders do not break formatting."""
    template = PromptTemplate(task="task-x", user_prompt="Do {action}.", placeholders='["action"]')

    messages = _build_messages(template, {"action": "the thing", "extra": "ignored"}, "task-x")

    assert messages[0].content == "Do the thing."


def test_resolve_model_kwargs_keeps_only_whitelisted_non_null_values() -> None:
    """Unsupported keys and ``None`` values are dropped."""
    merged = _resolve_model_kwargs({"temperature": 0.3, "unsupported": 9, "seed": None}, None)

    assert merged == {"temperature": 0.3}


def test_resolve_model_kwargs_lets_override_win() -> None:
    """A caller override takes precedence over the persisted value."""
    merged = _resolve_model_kwargs({"temperature": 0.3, "top_p": 0.9}, {"temperature": 0.0})

    assert merged == {"temperature": 0.0, "top_p": 0.9}


def test_resolve_model_kwargs_returns_empty_without_sources() -> None:
    """Without persisted or override parameters the result is empty."""
    assert _resolve_model_kwargs(None, None) == {}
