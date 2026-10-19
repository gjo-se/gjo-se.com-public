"""Resolution for LLM calls: mapping → model → credential → prompt.

Turns a task identifier plus placeholder variables into a
:class:`~app.shared.llm_gateway.client.prepared_call._PreparedCall` ready for
invocation. Shared by :meth:`LLMClient.call`, :meth:`LLMClient.call_text`,
:meth:`LLMClient.call_text_stream` and :meth:`LLMClient.resolve`.
"""

from __future__ import annotations

import json
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.client.prepared_call import _PreparedCall
from app.shared.llm_gateway.exceptions import (
    LLMModelDisabledError,
    NoCredentialForTaskError,
    NoModelForTaskError,
    NoPromptForTaskError,
    PromptVariableMissingError,
)
from app.shared.llm_gateway.services.prompt_service import PromptTemplate

_ALLOWED_MODEL_KWARGS: frozenset[str] = frozenset(
    {
        "temperature",
        "top_p",
        "max_tokens",
        "seed",
        "frequency_penalty",
        "presence_penalty",
        "stop",
    }
)
"""Sampling parameters forwarded from ``hyperparameters`` to the model class."""

_DISABLED_REASONING_VALUES: frozenset[str] = frozenset({"0", "disabled", "false", "none", "off"})
"""Values of the persisted ``reasoning`` hyperparameter that mean "do not reason"."""


def _resolve_disable_thinking(hyperparameters: dict[str, Any] | None) -> bool:
    """Return whether the task config explicitly asks to turn reasoning off.

    The persisted ``reasoning`` value is not a sampling parameter forwarded to
    the model class; it expresses intent and must be translated into the
    provider's native "thinking disabled" switch by the invocation layer.
    Without that translation a reasoning model can consume the whole
    ``max_tokens`` budget as reasoning tokens and return empty content.

    Args:
        hyperparameters: Task-model config hyperparameters (or ``None``).

    Returns:
        ``True`` when ``reasoning`` is set to an off/false/disabled value.
    """
    if not hyperparameters:
        return False
    value = hyperparameters.get("reasoning")
    if isinstance(value, bool):
        return not value
    if isinstance(value, str):
        return value.strip().lower() in _DISABLED_REASONING_VALUES
    return False


def _format_prompt(
    template: str,
    variables: dict[str, str],
    task: str,
    field: str,
) -> str:
    """Fill ``{placeholder}`` tokens in a prompt template.

    Args:
        template: Prompt string with ``{key}`` placeholders.
        variables: Placeholder values.
        task: Task identifier (for error messages).
        field: Field name being filled (for error messages).

    Returns:
        The formatted prompt string.

    Raises:
        PromptVariableMissingError: A referenced placeholder is missing.
    """
    try:
        return template.format(**variables)
    except KeyError as exc:
        raise PromptVariableMissingError(f"Variable {exc} missing for {field} in task '{task}'") from exc


def _resolve_model_kwargs(
    db_kwargs: dict[str, Any] | None,
    override: dict[str, Any] | None,
) -> dict[str, object]:
    """Merge persisted and explicit sampling parameters.

    Only keys from :data:`_ALLOWED_MODEL_KWARGS` with a non-``None`` value are
    kept. The explicit *override* wins over the persisted *db_kwargs* so a
    caller (e.g. the deterministic score task) can force values regardless of
    the stored model-config hyperparameters.

    Args:
        db_kwargs: ``hyperparameters`` dict from the task model config (or ``None``).
        override: Caller-provided override (or ``None``).

    Returns:
        The merged, whitelisted sampling parameters.
    """
    merged: dict[str, object] = {}
    for source in (db_kwargs, override):
        if not source:
            continue
        merged.update(
            {key: value for key, value in source.items() if key in _ALLOWED_MODEL_KWARGS and value is not None}
        )
    return merged


def _build_messages(
    prompt_template: PromptTemplate,
    variables: dict[str, str],
    task: str,
) -> list[HumanMessage | SystemMessage]:
    """Validate placeholders and fill the prompt template into messages.

    Args:
        prompt_template: Active ``PromptTemplate`` instance.
        variables: Placeholder values to fill.
        task: Task identifier (for error messages).

    Returns:
        System (optional) + user message with placeholders filled.

    Raises:
        PromptVariableMissingError: A declared placeholder is missing.
    """
    # Declared placeholders must all be present in variables
    declared = getattr(prompt_template, "placeholders", None)
    if declared:
        expected_keys = [p.strip("{}") for p in json.loads(declared)]
        missing = [k for k in expected_keys if k not in variables]
        if missing:
            raise PromptVariableMissingError(f"Missing variables for task '{task}': {missing}")

    messages: list[HumanMessage | SystemMessage] = []

    system_template = getattr(prompt_template, "system_prompt", None)
    if system_template:
        filled_system = _format_prompt(system_template, variables, task, "system_prompt")
        messages.append(SystemMessage(content=filled_system))

    user_template = prompt_template.user_prompt
    filled_user = _format_prompt(user_template, variables, task, "user_prompt")
    messages.append(HumanMessage(content=filled_user))

    return messages


async def resolve_call(
    db: AsyncSession,
    task: str,
    variables: dict[str, str],
    *,
    force_model_id: int | None = None,
    force_credential_id: int | None = None,
    hyperparameters: dict[str, Any] | None = None,
) -> _PreparedCall:
    """Resolve mapping → model → credential → prompt and build messages.

    Shared resolution flow for every call variant.

    1. **Registry check:** *task* must exist in ``TASK_REGISTRY``.
    2. **Mapping lookup:** ``TaskModelConfig`` resolved via *task*.
    3. **Model check:** Assigned model must be ``active=True``.
    4. **Credential lookup:** API key from ``AdminCredential``.
    4.5 **Prompt resolution:** Active prompt via ``PromptService.get_active_prompt()``,
        placeholders filled with ``str.format(**variables)``.

    Args:
        db: Active async database session.
        task: Task identifier (e.g. ``"description-merge"``).
        variables: Dict of placeholder values to fill into the prompt template.
        force_model_id: Optional model id override (used for fallback after
            primary model failure). When set, replaces ``mapping.model_id``.
        force_credential_id: Optional credential id override for the forced model.
        hyperparameters: Optional sampling-parameter override (merged over the
            persisted model-config ``hyperparameters``).

    Returns:
        A :class:`_PreparedCall` with messages, model identifier, key, portal.

    Raises:
        NoModelForTaskError: Unknown use case or no active mapping.
        LLMModelDisabledError: The mapped model is inactive.
        NoCredentialForTaskError: No valid credential for the resolved mapping.
        NoPromptForTaskError: No active prompt template for task.
        PromptVariableMissingError: Required placeholder variable missing.
    """
    # 1. Registry validation
    from app.shared.llm_gateway.domain.task_registry_rules import TASK_REGISTRY

    if task not in TASK_REGISTRY:
        raise NoModelForTaskError(f"Unknown task: {task}")

    db_session = db

    # 2. Mapping lookup – unified model config table
    from app.shared.llm_gateway.models.task_model_config import TaskModelConfig

    mapping = await db_session.scalar(
        select(TaskModelConfig).where(
            TaskModelConfig.task == task,
            TaskModelConfig.is_production == True,  # noqa: E712
        )
    )
    if mapping is None:
        # Fallback: no production row yet – try any config with a model
        mapping = await db_session.scalar(
            select(TaskModelConfig).where(
                TaskModelConfig.task == task,
            )
        )
    if mapping is None:
        raise NoModelForTaskError(f"No mapping for task: {task}")

    resolved_model_id = force_model_id if force_model_id is not None else mapping.model_id

    # 3. Model check
    from app.shared.llm_gateway.models.model import LLMModel

    model_row = await db_session.scalar(
        select(LLMModel).where(LLMModel.id == resolved_model_id, LLMModel.active == True)  # noqa: E712
    )
    if model_row is None:
        raise LLMModelDisabledError(f"Model not active for task: {task}")

    # 4. Credential lookup
    resolved_credential_id = force_credential_id if force_credential_id is not None else mapping.credential_id
    if resolved_credential_id is None:
        raise NoCredentialForTaskError(f"No credential configured for task: {task}")

    from app.shared.credential_store.models.admin_credential import AdminCredential

    cred_row = await db_session.scalar(
        select(AdminCredential).where(
            AdminCredential.id == resolved_credential_id,
            # active was migrated to core_statusable (#1076)
        )
    )
    if cred_row is None:
        raise NoCredentialForTaskError(f"No active credential for task: {task}")

    from app.shared.credential_store.dependencies.credential_store_dependencies import (
        get_admin_credential_service,
    )

    credentials = await get_admin_credential_service().get_credentials(db_session, cred_row.service)
    api_key = credentials.get("api_key") if credentials else None
    if not api_key:
        raise NoCredentialForTaskError(f"No valid credential for task: {task}")

    # 4.5 Prompt resolution
    from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_prompt_service

    prompt_template = await get_prompt_service().get_active_prompt(task)
    if prompt_template is None:
        raise NoPromptForTaskError(f"No active prompt for task: {task}")

    messages = _build_messages(prompt_template, variables, task)

    # Determine model identifier based on credential portal:
    #   openrouter → use full openrouter_id (e.g. "deepseek/deepseek-v4-flash")
    #   direct     → use native_model_id (e.g. "deepseek-v4-flash")
    portal: str | None = getattr(cred_row, "portal", None)
    model_identifier = model_row.openrouter_id if portal == "openrouter" else model_row.native_model_id

    # Build reproducible input snapshot for future retry (INC 2).
    output_schema_name = TASK_REGISTRY[task].output_schema
    input_snapshot: dict[str, Any] = {
        "variables": variables,
        "prompt_version": prompt_template.version,
        "output_schema": output_schema_name,
        "portal": portal,
    }

    # Resolve base_url from provider for OpenAI-compatible direct providers.
    base_url: str | None = None
    if portal == "direct":
        from app.shared.llm_gateway.models.provider import LLMProvider

        provider_row = await db_session.scalar(
            select(LLMProvider).where(LLMProvider.id == model_row.provider_id),
        )
        if provider_row is not None:
            base_url = provider_row.api_base

    from app.shared.db_access.trace import trace

    has_reasoning = model_row.reasoning is not None
    prepared = _PreparedCall(
        messages=messages,
        model_identifier=model_identifier,
        api_key=api_key,
        portal=portal,
        base_url=base_url,
        credential_service=cred_row.service,
        prompt_version=prompt_template.version,
        has_reasoning=has_reasoning,
        output_mode=TASK_REGISTRY[task].output_mode,
        model_kwargs=_resolve_model_kwargs(mapping.hyperparameters, hyperparameters),
        input_snapshot=input_snapshot,
        disable_thinking=has_reasoning
        and (_resolve_disable_thinking(mapping.hyperparameters) or _resolve_disable_thinking(hyperparameters)),
    )
    trace("12_llm_prepared", task=task, model=model_identifier, credential=cred_row.service, portal=portal)
    return prepared
