"""User route: list LLM providers with readiness status."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access.session import get_db
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_llm_provider_service
from app.shared.llm_gateway.schemas.model_schemas import LLMProviderStatusResponse
from app.shared.security.dependencies.auth_dependencies import UserUser

router = APIRouter()


@router.get(
    "/providers",
    response_model=list[LLMProviderStatusResponse],
    summary="List all providers with 3-tier readiness status",
)
async def list_user_providers(
    current_user: UserUser,
    db: AsyncSession = Depends(get_db),
) -> list[LLMProviderStatusResponse]:
    """Return all known providers with their readiness status for the current user.

    Tier 1 – Known: provider exists in DB.
    Tier 2 – Supported: PROVIDER_REGISTRY entry + package importable.
    Tier 3 – Usable: user has a validated API key.

    Args:
        current_user: Authenticated user.
        db: Async database session.

    Returns:
        List of LLMProviderStatusResponse ordered by name.
    """
    return await get_llm_provider_service().list_with_status(db, current_user.id)
