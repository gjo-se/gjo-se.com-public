"""Database access for LLM providers (llm_gateway).

Read operations return :class:`ProviderRecord` / :class:`ProviderStatusRecord`
domain objects (never ORM models) so the service layer stays free of
``app.shared.llm_gateway.models`` imports (Achse 2: ``services`` >
``repositories``). The ``AsyncSession`` is passed in by the caller (K3).
"""

from __future__ import annotations

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.domain.provider_contract import (
    ProviderRecord,
    ProviderStatusRecord,
)
from app.shared.llm_gateway.models.api_key import UserApiKey
from app.shared.llm_gateway.models.provider import LLMProvider

logger = structlog.get_logger(__name__)


async def list_with_user_keys(db: AsyncSession, user_id: int) -> list[ProviderStatusRecord]:
    """Returns all providers with the given user's key metadata.

    Args:
        db: Active async database session.
        user_id: ID of the requesting user.

    Returns:
        Provider status records ordered alphabetically by provider name.
    """
    stmt = (
        select(
            LLMProvider.id,
            LLMProvider.name,
            LLMProvider.display_name,
            UserApiKey.id.label("key_id"),
            UserApiKey.valid_at,
            UserApiKey.label,
        )
        .outerjoin(
            UserApiKey,
            (UserApiKey.provider_id == LLMProvider.id) & (UserApiKey.user_id == user_id),
        )
        .order_by(LLMProvider.name)
    )
    rows = (await db.execute(stmt)).all()
    return [
        ProviderStatusRecord(
            id=row.id,
            name=row.name,
            display_name=row.display_name,
            key_id=row.key_id,
            valid_at=row.valid_at,
            label=row.label,
        )
        for row in rows
    ]


async def get_or_create_by_name(
    db: AsyncSession,
    provider_name: str,
    display_name: str,
) -> ProviderRecord:
    """Returns the provider row for *provider_name*, creating it if absent.

    Args:
        db: Active async database session.
        provider_name: Provider identifier, e.g. ``'openai'``.
        display_name: Display name used when the row is created.

    Returns:
        The existing or newly created provider as a record.
    """
    existing = await db.scalar(select(LLMProvider).where(LLMProvider.name == provider_name))
    if existing is not None:
        return ProviderRecord(id=existing.id, name=existing.name, display_name=existing.display_name)

    new_provider = LLMProvider(name=provider_name, display_name=display_name)
    db.add(new_provider)
    await db.flush()
    logger.debug("Auto-created LLMProvider '%s'", provider_name)
    return ProviderRecord(id=new_provider.id, name=new_provider.name, display_name=new_provider.display_name)


async def get_api_base_by_id(db: AsyncSession, provider_id: int) -> str | None:
    """Returns the API base URL of a provider row, or ``None`` when absent.

    Args:
        db: Active async database session.
        provider_id: Primary key of the provider row.

    Returns:
        The configured ``api_base`` URL, or ``None`` when the provider is absent
        or has no base URL.
    """
    return await db.scalar(select(LLMProvider.api_base).where(LLMProvider.id == provider_id))
