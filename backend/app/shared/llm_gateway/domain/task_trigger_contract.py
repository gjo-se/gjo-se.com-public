"""Trigger-source enums for code-known LLM tasks.

Each enum is the single source of truth (SSOT) for the trigger values one task
accepts: the code – not the database – defines which trigger sources a task
supports. :class:`~app.shared.llm_gateway.domain.task_definition_contract.TaskDefinition`
binds a task to its allowed trigger enums.

Usage::

    from app.shared.llm_gateway.domain.task_trigger_contract import DescriptionMergeTrigger

    DescriptionMergeTrigger.PIPELINE
"""

from enum import StrEnum

# ── Trigger enums (SSOT per task) ────────────────────────────────────────────


class DescriptionMergeTrigger(StrEnum):
    """Valid trigger sources for the ``description-merge`` task."""

    PIPELINE = "pipeline"
    BULK = "bulk"
    BUTTON = "button"
    ADMIN_DEBUG = "admin-debug"


class SkillExtractionTrigger(StrEnum):
    """Valid trigger sources for the ``skill-extraction`` task."""

    PIPELINE = "pipeline"
    BULK = "bulk"
    BACKFILL = "backfill"
    AUTO_RETRY = "auto-retry"
    MANUAL_RETRY = "manual-retry"
    ADMIN_DEBUG = "admin-debug"


class InlineExplainTrigger(StrEnum):
    """Valid trigger sources for the ``inline-explain`` task."""

    CONTEXT_MENU = "context-menu"


class AddressExtractionTrigger(StrEnum):
    """Valid trigger sources for the ``address-extraction`` task."""

    BUTTON = "button"
    ADMIN_DEBUG = "admin-debug"


class EndcustomerTrigger(StrEnum):
    """Valid trigger sources for ``endcustomer-*`` tasks."""

    PIPELINE = "pipeline"
    BUTTON = "button"
    ADMIN_DEBUG = "admin-debug"
    ACT_TEST = "act-test"


class DiagnoseTrigger(StrEnum):
    """Valid trigger sources for the ``incident-analysis`` task."""

    MANUAL = "manual"
    ALERT = "alert"


class ScanCodeEnrichTrigger(StrEnum):
    """Valid trigger sources for the ``scan-code-enrich`` task."""

    PIPELINE = "pipeline"
    ADMIN_DEBUG = "admin-debug"


class ComponentSummaryTrigger(StrEnum):
    """Valid trigger sources for the ``component-summary`` task."""

    PIPELINE = "pipeline"
    ADMIN_DEBUG = "admin-debug"


class RejectedNoticeTrigger(StrEnum):
    """Valid trigger sources for the ``rejected-notice`` task."""

    UI = "ui"
    ADMIN_DEBUG = "admin-debug"


class ApplicationScoreTrigger(StrEnum):
    """Valid trigger sources for the ``application-score`` task."""

    BUTTON = "button"
    ADMIN_DEBUG = "admin-debug"
