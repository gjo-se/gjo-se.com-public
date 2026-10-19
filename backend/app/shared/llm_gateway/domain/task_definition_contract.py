"""Core records describing a code-known LLM task.

:class:`TaskDefinition` binds a task key to its allowed triggers, prompt
placeholders and output mode; :class:`PlaceholderDefinition` describes one
prompt variable the code provides. The concrete registry lives in
:mod:`app.shared.llm_gateway.domain.task_registry_rules`.
"""

from dataclasses import dataclass
from enum import StrEnum
from typing import Literal


@dataclass(frozen=True)
class PlaceholderDefinition:
    """Describes a prompt variable that the code provides.

    Attributes:
        key: Variable key for prompt templates (e.g. ``"master_title"``).
        label: Human-readable short label for the admin UI.
        description: What value this placeholder represents.
        category: Grouping hint for the UI (e.g. ``"Master"``, ``"Slave"``).
    """

    key: str
    label: str
    description: str
    category: str


@dataclass(frozen=True)
class TaskDefinition:
    """Describes a code-known LLM task.

    Attributes:
        key: Unique identifier for the code binding (e.g. ``"description-merge"``).
        display_name: Human-readable label for the admin interface.
        description: Short one-liner shown as list tooltip.
        allowed_triggers: Tuple of valid trigger enum values for this task
            (SSOT – defines which triggers the code supports).
        placeholders: Prompt variables the service provides for this task.
        output_mode: Whether the task expects structured output (``"structured"``)
            or free-form text (``"text"``). Drives :meth:`LLMClient.call` vs
            :meth:`LLMClient.call_text` and controls thinking-mode behaviour.
    """

    key: str
    display_name: str
    description: str
    allowed_triggers: tuple[StrEnum, ...]
    placeholders: list[PlaceholderDefinition]
    output_mode: Literal["structured", "text"] = "text"
    output_schema: str | None = None
    """Fully-qualified path for lazy import, e.g.
    ``"fbf.services.skill_extraction_service:SkillExtractionResult"``.
    Only relevant when ``output_mode="structured"``."""
