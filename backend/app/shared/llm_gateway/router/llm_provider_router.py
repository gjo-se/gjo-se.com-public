"""Admin routes for the LLM provider registry."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access.session import get_db
from app.shared.llm_gateway.models.provider import LLMProvider
from app.shared.llm_gateway.schemas.model_schemas import (
    LLMProviderAdminResponse,
    LLMProviderPatchRequest,
)
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


@router.get(
    "/providers",
    response_model=list[LLMProviderAdminResponse],
    summary="[Admin] List all providers",
)
async def list_providers(
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> list[LLMProviderAdminResponse]:
    """Return all known providers ordered by name ascending.

    Does **not** filter tilde (``~``) prefixed providers – the frontend decides
    whether to display them.

    Args:
        _admin: Admin user guard.
        db: Async database session.

    Returns:
        List of LLMProviderAdminResponse ordered by name.
    """
    stmt = select(LLMProvider).order_by(LLMProvider.name)
    rows = (await db.execute(stmt)).scalars().all()
    return [
        LLMProviderAdminResponse(
            id=row.id,
            name=row.name,
            display_name=row.display_name,
            api_base=row.api_base,
            created_at=row.created_at,
        )
        for row in rows
    ]


@router.patch(
    "/providers/{provider_id}",
    response_model=LLMProviderAdminResponse,
    summary="[Admin] Update a provider",
)
async def update_provider(
    provider_id: int,
    body: LLMProviderPatchRequest,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> LLMProviderAdminResponse:
    """Update a provider's editable fields (api_base).

    Args:
        provider_id: Provider primary key.
        body: Fields to update.
        _admin: Admin user guard.
        db: Async database session.

    Returns:
        The updated provider.

    Raises:
        HTTPException 404: Provider not found.
    """
    row = await db.scalar(select(LLMProvider).where(LLMProvider.id == provider_id))
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Provider {provider_id} not found",
        )

    if body.api_base is not None:
        row.api_base = body.api_base

    await db.commit()
    await db.refresh(row)

    return LLMProviderAdminResponse(
        id=row.id,
        name=row.name,
        display_name=row.display_name,
        api_base=row.api_base,
        created_at=row.created_at,
    )
