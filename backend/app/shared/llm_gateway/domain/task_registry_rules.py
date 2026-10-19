"""Task registry for LLM tasks.

Every task supported by the LLM subsystem is registered here.
The registry is the single source of truth for all code-known tasks.

The task definitions live in focused data modules (grouped by pipeline area);
this module is the stable re-export facade so consumers keep importing from
``app.shared.llm_gateway.domain.task_registry_rules``.

Usage::

    from app.shared.llm_gateway.domain.task_registry_rules import TASK_REGISTRY

    if task not in TASK_REGISTRY:
        raise ValueError(f"Unknown task: {task}")
"""

from app.shared.llm_gateway.domain.task_definition_contract import (
    PlaceholderDefinition,
    TaskDefinition,
)
from app.shared.llm_gateway.domain.task_registry_core_contract import CORE_TASK_DEFINITIONS
from app.shared.llm_gateway.domain.task_registry_endcustomer_contract import (
    ENDCUSTOMER_TASK_DEFINITIONS,
)
from app.shared.llm_gateway.domain.task_registry_platform_contract import (
    PLATFORM_TASK_DEFINITIONS,
)
from app.shared.llm_gateway.domain.task_trigger_contract import (
    AddressExtractionTrigger,
    ApplicationScoreTrigger,
    ComponentSummaryTrigger,
    DescriptionMergeTrigger,
    DiagnoseTrigger,
    EndcustomerTrigger,
    InlineExplainTrigger,
    RejectedNoticeTrigger,
    ScanCodeEnrichTrigger,
    SkillExtractionTrigger,
)

__all__ = [
    "TASK_REGISTRY",
    "AddressExtractionTrigger",
    "ApplicationScoreTrigger",
    "ComponentSummaryTrigger",
    "DescriptionMergeTrigger",
    "DiagnoseTrigger",
    "EndcustomerTrigger",
    "InlineExplainTrigger",
    "PlaceholderDefinition",
    "RejectedNoticeTrigger",
    "ScanCodeEnrichTrigger",
    "SkillExtractionTrigger",
    "TaskDefinition",
]

#: All code-known tasks for the LLM subsystem.
#: Adding a new task = add an entry here + create/configure a mapping
#: row in ``llm_task_model_config``.
#:
#: The group order is the registry order (dicts preserve insertion order) and
#: is therefore behaviour: consumers iterate ``TASK_REGISTRY`` to list tasks.
TASK_REGISTRY: dict[str, TaskDefinition] = {
    **CORE_TASK_DEFINITIONS,
    **ENDCUSTOMER_TASK_DEFINITIONS,
    **PLATFORM_TASK_DEFINITIONS,
}
