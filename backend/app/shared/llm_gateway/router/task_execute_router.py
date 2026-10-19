"""Admin task utilities: manual execution and LangSmith deep-link."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access.session import get_db
from app.shared.llm_gateway.domain.task_registry_rules import TASK_REGISTRY
from app.shared.llm_gateway.schemas.task_schemas import (
    TaskExecuteRequest,
    TaskExecuteResponse,
)
from app.shared.security.dependencies.auth_dependencies import AdminUser

logger = structlog.get_logger(__name__)

router = APIRouter()


@router.post(
    "/tasks/execute",
    response_model=TaskExecuteResponse,
    summary="[Admin] Execute an LLM task manually (debug/test)",
)
async def execute_task_endpoint(
    body: TaskExecuteRequest,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> TaskExecuteResponse:
    """Manually execute a registered LLM task for debugging or testing.

    Runs the task synchronously (no arq queue). The task key must exist in
    ``TASK_REGISTRY``. A call-log row is written for every execution.

    Args:
        body: Task key, variables, and project id.
        _admin: Admin user guard.
        db: Async database session.

    Returns:
        TaskExecuteResponse with success, result, and optional error_type.
    """
    from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_task_executor_service

    if body.task not in TASK_REGISTRY:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown task: '{body.task}'",
        )

    # Resolve the correct ADMIN_DEBUG trigger enum for the task
    definition = TASK_REGISTRY[body.task]
    allowed = definition.allowed_triggers
    admin_trigger: str | None = None
    for t in allowed:
        if t.value == "admin-debug":
            admin_trigger = t
            break

    result = await get_task_executor_service().execute_task(
        db=db,
        task_key=body.task,
        variables=body.variables,
        project_id=body.project_id,
        trigger=admin_trigger,
    )
    return TaskExecuteResponse(
        success=result["success"],
        result=result["result"],
        error_type=result["error_type"],
    )


@router.get(
    "/tasks/{task}/langsmith-url",
    summary="LangSmith deep-link for a task's traces",
)
async def get_langsmith_url(
    task: str,
    _admin: AdminUser,
) -> dict[str, str]:
    """Return a deep-link URL to the LangSmith dashboard filtered by this task."""
    from urllib.parse import urlencode

    from app.shared.config.config import settings
    from app.shared.observability.infrastructure.observability_client import get_langsmith_dashboard_url

    base = settings.LANGSMITH_WEB_URL or settings.LANGSMITH_ENDPOINT
    if not base or not settings.LANGSMITH_TRACING:
        return {"url": ""}

    try:
        project_url = get_langsmith_dashboard_url()
        filter_param = urlencode({"filter": f'eq(task,"{task}")'})
        url = f"{project_url}?{filter_param}" if project_url else ""
        return {"url": url}
    except Exception:
        logger.exception("Could not resolve LangSmith URL for task=%s", task)
        return {"url": ""}
