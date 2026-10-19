"""Service layer for versioned LLM prompt template management.

LangFuse is the single source of truth (SSOT) for prompts.
All reads and writes go exclusively to LangFuse.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

import structlog

logger = structlog.get_logger(__name__)


@dataclass
class PromptTemplate:
    """Lightweight prompt template container – replacement for the former
    ``PromptTemplate`` dataclass (former SQLAlchemy model).

    All fields previously provided by the ORM model are retained so
    downstream consumers (client, admin router) continue to work.
    """

    task: str
    user_prompt: str
    version: int = 1
    system_prompt: str | None = None
    active: bool = False
    placeholders: str | None = None
    changelog: str | None = None
    id: int = 0
    created_at: datetime | None = field(default_factory=lambda: datetime.now(UTC))


@dataclass
class PromptData:
    """Input data for creating a new prompt template version.

    Attributes:
        system_prompt: Optional system-level instruction.
        user_prompt: Mandatory user-level prompt text.
        placeholders: Optional list of expected placeholder names.
        changelog: Optional description of the change.
    """

    system_prompt: str | None
    user_prompt: str
    placeholders: list[str] | None = None
    changelog: str | None = None


def _langfuse_prompt_to_template(task: str, prompt: object) -> PromptTemplate:
    """Convert a LangFuse prompt client to a PromptTemplate."""
    config = getattr(prompt, "config", {}) or {}
    version = getattr(prompt, "version", 0)
    labels = getattr(prompt, "labels", []) or []
    prompt_text = getattr(prompt, "prompt", "") or ""

    return PromptTemplate(
        task=task,
        system_prompt=config.get("system_prompt"),
        user_prompt=prompt_text,
        version=version,
        active="production" in labels if isinstance(labels, list) else False,
        placeholders=json.dumps(config.get("placeholders")) if config.get("placeholders") else None,
        changelog=config.get("changelog"),
    )


class PromptService:
    """Service for managing versioned, immutable LLM prompt templates.

    All operations read from and write to LangFuse exclusively.
    The local prompt template table is no longer used.
    """

    # ── Read ──────────────────────────────────────────────────────────────

    async def get_active_prompt(self, task: str) -> PromptTemplate | None:
        """Return the currently active prompt version from LangFuse.

        Resolves via ``langfuse.get_prompt(name, label="production")``.

        Args:
            task: Task key, e.g. ``"description-merge"``.

        Returns:
            The active ``PromptTemplate``, or ``None`` if none is active
            or LangFuse is not configured.
        """
        from app.shared.config.config import settings
        from app.shared.llm_gateway.langfuse_client import get_langfuse_client, is_langfuse_healthy

        langfuse = get_langfuse_client()
        if langfuse is None:
            return None

        if not is_langfuse_healthy():
            from app.shared.llm_gateway.exceptions import LangfuseUnreachableError

            raise LangfuseUnreachableError(
                "LangFuse ist nicht erreichbar — Prompt-Templates können nicht "
                "geladen werden. Bitte LangFuse-Container starten: "
                "docker compose -f docker-compose.langfuse.yml up -d"
            )

        prompt = langfuse.get_prompt(  # type: ignore[union-attr]
            name=task,
            label="production",
            cache_ttl_seconds=settings.LANGFUSE_PROMPT_CACHE_TTL,
        )
        logger.debug(
            "prompt_service: resolved '%s' from LangFuse (label=production)",
            task,
        )
        return _langfuse_prompt_to_template(task, prompt)

    async def get_version_history(self, task: str) -> list[PromptTemplate]:
        """Return all known versions for a use-case from LangFuse.

        Tries to retrieve the active prompt as a single-entry list.
        Full version history is available in the LangFuse UI.

        Args:
            task: Task key.

        Returns:
            List of ``PromptTemplate`` instances, newest first.
            Empty if LangFuse is unavailable or no prompt exists.
        """
        active = await self.get_active_prompt(task)
        return [active] if active is not None else []

    # ── Write ─────────────────────────────────────────────────────────────

    async def create_version(
        self,
        task: str,
        data: PromptData,
    ) -> PromptTemplate | None:
        """Create a new prompt version in LangFuse.

        Args:
            task: Task key.
            data: Prompt content for the new version.

        Returns:
            A synthetic ``PromptTemplate`` built from the LangFuse
            response, or ``None`` if LangFuse is not configured.
        """
        from app.shared.llm_gateway.langfuse_client import get_langfuse_client

        langfuse = get_langfuse_client()
        if langfuse is None:
            logger.warning(
                "prompt_service: create_version skipped for task '%s' – LangFuse not configured",
                task,
            )
            return None

        config: dict[str, Any] = {}
        if data.system_prompt:
            config["system_prompt"] = data.system_prompt
        if data.placeholders:
            config["placeholders"] = data.placeholders
        if data.changelog:
            config["changelog"] = data.changelog

        try:
            created = langfuse.create_prompt(  # type: ignore[union-attr]
                name=task,
                prompt=data.user_prompt,
                labels=["latest"],
                config=config if config else None,
                type="text",
            )
            logger.info(
                "prompt_service: created prompt '%s' in LangFuse",
                task,
            )
            await _trigger_eval(task)
            return _langfuse_prompt_to_template(task, created)
        except Exception:
            logger.exception(
                "prompt_service: LangFuse create_prompt failed for task '%s'",
                task,
            )
            return None

    async def set_active(
        self,
        task: str,
        version: int,
    ) -> PromptTemplate | None:
        """Activate a specific version via LangFuse labels.

        Uses ``langfuse.update_prompt()`` to set the ``production`` label
        on the target version.

        Args:
            task: Task key.
            version: Version number to activate.

        Returns:
            A ``PromptTemplate`` built from LangFuse, or ``None`` on failure.
        """
        from app.shared.llm_gateway.langfuse_client import get_langfuse_client

        langfuse = get_langfuse_client()
        if langfuse is None:
            return None

        try:
            langfuse.update_prompt(  # type: ignore[union-attr]
                name=task,
                version=version,
                new_labels=["production"],
            )
            logger.info(
                "prompt_service: set production label on '%s' v%d in LangFuse",
                task,
                version,
            )
            await _trigger_eval(task)

            # Return the newly activated prompt for the caller
            return await self.get_active_prompt(task)
        except Exception:
            logger.exception(
                "prompt_service: LangFuse update_prompt failed for task '%s' v%d",
                task,
                version,
            )
            return None


async def _trigger_eval(task_key: str) -> None:
    """Enqueue an evaluation run after a prompt change (best-effort)."""
    try:
        from app.shared.workflow_runtime.infrastructure.restate.dispatch import enqueue_eval_task

        await enqueue_eval_task(task_key, "prompt_change")
    except Exception:
        logger.exception(
            "prompt_service: eval trigger skipped for task '%s' (arq not available)",
            task_key,
        )
