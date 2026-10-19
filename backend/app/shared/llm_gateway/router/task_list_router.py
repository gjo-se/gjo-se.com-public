"""Task listing route (admin-only) with batch core-status resolution."""

from __future__ import annotations

from collections.abc import Sequence

import structlog
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.shared.db_access.session import get_db
from app.shared.llm_gateway.domain.task_registry_rules import TASK_REGISTRY
from app.shared.llm_gateway.models.task_model_config import TaskModelConfig
from app.shared.llm_gateway.schemas.task_schemas import (
    PlaceholderResponse,
    TaskMappingResponse,
    TaskWithMappingResponse,
)
from app.shared.security.dependencies.auth_dependencies import AdminUser

logger = structlog.get_logger(__name__)

router = APIRouter()


async def _resolve_task_statuses(
    configs: Sequence[TaskModelConfig],
) -> dict[int, tuple[str | None, str | None]]:
    """Batch-resolve core_status for llm_task_model_config from gjo_se_com.

    Returns a map ``config.id -> (status_name, color_token)`` so callers build
    the response projection explicitly instead of mutating the ORM entity.
    """
    ids = [c.id for c in configs]
    if not ids:
        return {}
    try:
        from app.shared.db_access.session import AsyncSessionLocal
        from app.shared.status.repositories import statusable_repository

        async with AsyncSessionLocal() as gjo_db:
            return await statusable_repository.resolve_status_map(gjo_db, "llm_task_model_config", ids)
    except Exception:
        logger.exception("Failed to resolve llm_task_model_config statuses")
        return {}


@router.get(
    "/tasks",
    response_model=list[TaskWithMappingResponse],
    summary="[Admin] List all tasks with current mappings",
)
async def list_tasks(
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> list[TaskWithMappingResponse]:
    """Return all code-registered LLM tasks combined with their current
    production model configs from the unified model config table.

    Args:
        _admin: Admin user guard.
        db: Async database session.

    Returns:
        List of TaskWithMappingResponse.
    """
    # Collect all production configs per task (without is_active filter).
    prod_configs = (
        (
            await db.execute(
                select(TaskModelConfig)
                .options(
                    selectinload(TaskModelConfig.model),
                    selectinload(TaskModelConfig.credential),
                )
                .where(
                    TaskModelConfig.is_production == True,  # noqa: E712
                )
            )
        )
        .scalars()
        .all()
    )
    production_by_task: dict[str, TaskModelConfig] = {c.task: c for c in prod_configs}

    # Batch-resolve core_status from gjo_se_com
    status_map = await _resolve_task_statuses(prod_configs)

    result: list[TaskWithMappingResponse] = []
    for key, definition in TASK_REGISTRY.items():
        prod = production_by_task.get(key)
        mapping = None
        if prod is not None:
            entry = status_map.get(prod.id)
            mapping = TaskMappingResponse(
                id=prod.id,
                model_id=prod.model_id,
                model_display_name=prod.model.display_name if prod.model else None,
                credential_id=prod.credential_id,
                credential_label=prod.credential.label if prod.credential else None,
                credential_portal=prod.credential.portal if prod.credential else None,
                credential_provider=prod.credential.provider if prod.credential else None,
                status=entry[0] if entry else None,
                status_color_token=entry[1] if entry else None,
            )
        result.append(
            TaskWithMappingResponse(
                key=key,
                display_name=definition.display_name,
                description=definition.description,
                allowed_triggers=[t.value for t in definition.allowed_triggers],
                placeholders=[
                    PlaceholderResponse(
                        key=p.key,
                        label=p.label,
                        description=p.description,
                        category=p.category,
                    )
                    for p in definition.placeholders
                ],
                mapping=mapping,
                active_prompt_version=None,
            )
        )
    return result
