"""Admin route: LangSmith observability config for the dashboard link."""

from __future__ import annotations

from fastapi import APIRouter

from app.shared.config.config import settings
from app.shared.llm_gateway.schemas.call_log_schemas import ObservabilityOut
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


@router.get(
    "/observability",
    response_model=ObservabilityOut,
    summary="[Admin] LangSmith observability config for the dashboard link",
)
async def get_observability(_admin: AdminUser) -> ObservabilityOut:
    """Return the LangSmith tracing status, project, and dashboard URL.

    Args:
        _admin: Admin user guard.

    Returns:
        ObservabilityOut with ``enabled``, ``project``, and deep-link ``url``.
    """
    from app.shared.observability.infrastructure.observability_client import get_langsmith_dashboard_url

    return ObservabilityOut(
        enabled=settings.LANGSMITH_TRACING and bool(settings.LANGSMITH_API_KEY),
        project=settings.LANGSMITH_PROJECT,
        url=get_langsmith_dashboard_url(),
    )
