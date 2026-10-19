"""Aggregator for the LLM gateway routers (user, providers, admin).

Each responsibility (API keys, call log, circuit breaker, observability,
inline-explain, rejected notice) lives in its own route module; this module
only composes them onto the three layer routers mounted in
``app.api.v1.router``.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access.session import get_db
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_user_api_key_service
from app.shared.llm_gateway.router.llm_api_key_router import admin_router as llm_api_key_admin_router
from app.shared.llm_gateway.router.llm_api_key_router import user_router as llm_api_key_user_router
from app.shared.llm_gateway.router.llm_call_log_router import router as llm_call_log_router
from app.shared.llm_gateway.router.llm_circuit_breaker_router import router as llm_circuit_breaker_router
from app.shared.llm_gateway.router.llm_inline_explain_router import router as llm_inline_explain_router
from app.shared.llm_gateway.router.llm_observability_router import router as llm_observability_router
from app.shared.llm_gateway.router.llm_provider_router import router as llm_provider_router
from app.shared.llm_gateway.router.llm_provider_user_router import router as llm_provider_user_router
from app.shared.llm_gateway.router.llm_rejected_notice_router import router as llm_rejected_notice_router
from app.shared.llm_gateway.router.models_router import models_router
from app.shared.llm_gateway.router.task_router import task_router
from app.shared.llm_gateway.schemas.user_api_key_schemas import UserApiKeyResponse
from app.shared.security.dependencies.auth_dependencies import UserUser

user_router = APIRouter()
providers_router = APIRouter()
admin_router = APIRouter()


@user_router.get(
    "",
    response_model=list[UserApiKeyResponse],
    summary="List API keys for the current user",
)
async def list_user_api_keys(
    current_user: UserUser,
    db: AsyncSession = Depends(get_db),
) -> list[UserApiKeyResponse]:
    """Return all stored API-key metadata for the authenticated user.

    The ``key_value`` field is never included in the response.

    Args:
        current_user: Authenticated user (injected by dependency).
        db: Async database session (injected by dependency).

    Returns:
        List of UserApiKeyResponse objects ordered by provider.
    """
    return await get_user_api_key_service().list_for_user(db, current_user.id)


# ── User routes ───────────────────────────────────────────────────────────────
user_router.include_router(llm_api_key_user_router, prefix="")

# ── Provider routes (user) ────────────────────────────────────────────────────
providers_router.include_router(llm_provider_user_router, prefix="")

# ── Admin routes ──────────────────────────────────────────────────────────────
# The static ``/call-logs/promoted`` and ``/call-logs/promote-batch`` routes live
# in the promote router (composed onto ``task_router``). They must be registered
# BEFORE the dynamic ``GET /call-logs/{call_log_id}`` – otherwise the path
# parameter shadows them and both answer 422.
admin_router.include_router(llm_api_key_admin_router, prefix="")
admin_router.include_router(llm_provider_router, prefix="")
admin_router.include_router(task_router, prefix="")
admin_router.include_router(llm_call_log_router, prefix="")
admin_router.include_router(llm_circuit_breaker_router, prefix="")
admin_router.include_router(llm_observability_router, prefix="")
admin_router.include_router(llm_inline_explain_router, prefix="")
admin_router.include_router(llm_rejected_notice_router, prefix="")
admin_router.include_router(models_router, prefix="")
