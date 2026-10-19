"""Provider-specific construction of the chat runnable.

Isolates the DeepSeek quirks (thinking mode + ``function_calling``) from the
provider-agnostic call lifecycle, plus the shared LangChain invoke/stream
config (Langfuse callbacks + metadata). The same chat-runnable builder is used
for structured, plain-text and streaming calls so provider parameters (base URL,
thinking mode) are applied consistently.
"""

from __future__ import annotations

from typing import Any

from langchain_core.runnables import RunnableConfig
from langfuse.langchain import CallbackHandler as LangfuseCallbackHandler

from app.shared.llm_gateway.client.prepared_call import _PreparedCall
from app.shared.llm_gateway.client.providers import get_llm_client


def build_invoke_config(
    langfuse_handler: LangfuseCallbackHandler,
    project_id: int | None,
    trigger: str | None,
    task: str,
    model_identifier: str,
    portal: str | None,
) -> RunnableConfig:
    """Build the LangChain invoke/stream config (Langfuse callbacks + metadata)."""
    return {
        "callbacks": [langfuse_handler],
        "metadata": {
            "langfuse_tags": [str(project_id)] if project_id else [],
            "langfuse_metadata": {
                "trigger": trigger or "",
                "task": task,
                "model": model_identifier,
                "portal": portal or "",
            },
        },
    }


def build_chat_llm(prepared: _PreparedCall) -> Any:
    """Build the chat model for a prepared call.

    Thinking mode is disabled in two cases:

    * structured output – DeepSeek V4 reasoning models block ``tool_choice``
      (``function_calling`` would fail);
    * plain text/streaming calls whose task config explicitly sets
      ``reasoning: off`` – otherwise reasoning tokens can exhaust the
      ``max_tokens`` budget and the provider returns empty content.

    Args:
        prepared: Resolved call parameters.

    Returns:
        Configured LangChain chat model.
    """
    disable_thinking = prepared.disable_thinking or (prepared.output_mode == "structured" and prepared.has_reasoning)
    extra_body: dict[str, object] | None = None
    if disable_thinking:
        extra_body = {"thinking": {"type": "disabled"}}

    return get_llm_client(
        prepared.model_identifier,
        prepared.api_key,
        portal=prepared.portal,
        base_url=prepared.base_url,
        extra_body=extra_body,
        model_kwargs=prepared.model_kwargs,
    )


def build_structured_llm(prepared: _PreparedCall, output_schema: type[Any]) -> Any:
    """Build the structured-output runnable for a prepared call."""
    llm = build_chat_llm(prepared)

    # DeepSeek native API uses function_calling (no json_schema support).
    kwargs: dict[str, object] = {}
    if prepared.model_identifier.startswith("deepseek-"):
        kwargs["method"] = "function_calling"
    return llm.with_structured_output(output_schema, include_raw=True, **kwargs)  # type: ignore[arg-type]
