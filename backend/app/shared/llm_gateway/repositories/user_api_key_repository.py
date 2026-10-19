"""Database access for user-scoped LLM provider API keys (llm_gateway).

Read/write operations return :class:`UserApiKeyRecord` domain objects (never ORM
models) so the service layer stays free of
``app.shared.llm_gateway.models`` imports (Achse 2: ``services`` >
``repositories``). The ``AsyncSession`` is passed in by the caller (K3).
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.domain.user_api_key_contract import UserApiKeyRecord
from app.shared.llm_gateway.models.api_key import UserApiKey
from app.shared.llm_gateway.models.provider import LLMProvider


def _to_record(row: UserApiKey, provider_name: str | None = None) -> UserApiKeyRecord:
    """Maps a ``UserApiKey`` ORM row to its domain record."""
    return UserApiKeyRecord(
        id=row.id,
        user_id=row.user_id,
        provider_id=row.provider_id,
        label=row.label,
        valid_at=row.valid_at,
        validation_error=row.validation_error,
        created_at=row.created_at,
        key_value=row.key_value,
        provider_name=provider_name,
    )


async def list_for_user(db: AsyncSession, user_id: int) -> list[UserApiKeyRecord]:
    """Returns all key records for *user_id* ordered by provider name."""
    stmt = (
        select(UserApiKey, LLMProvider.name.label("provider_name"))
        .join(LLMProvider, UserApiKey.provider_id == LLMProvider.id)
        .where(UserApiKey.user_id == user_id)
        .order_by(LLMProvider.name)
    )
    rows = (await db.execute(stmt)).all()
    return [_to_record(row.UserApiKey, row.provider_name) for row in rows]


async def list_all(db: AsyncSession) -> list[UserApiKeyRecord]:
    """Returns all key records across all users, ordered by user and provider."""
    stmt = (
        select(UserApiKey, LLMProvider.name.label("provider_name"))
        .join(LLMProvider, UserApiKey.provider_id == LLMProvider.id)
        .order_by(UserApiKey.user_id, LLMProvider.name)
    )
    rows = (await db.execute(stmt)).all()
    return [_to_record(row.UserApiKey, row.provider_name) for row in rows]


async def get_by_user_and_provider(
    db: AsyncSession,
    user_id: int,
    provider_id: int,
) -> UserApiKeyRecord | None:
    """Returns the key record for *(user_id, provider_id)* joined with its provider name."""
    stmt = (
        select(UserApiKey, LLMProvider.name.label("provider_name"))
        .join(LLMProvider, UserApiKey.provider_id == LLMProvider.id)
        .where(
            UserApiKey.user_id == user_id,
            UserApiKey.provider_id == provider_id,
        )
    )
    row = (await db.execute(stmt)).first()
    return _to_record(row.UserApiKey, row.provider_name) if row is not None else None


async def get_by_id(db: AsyncSession, key_id: int) -> UserApiKeyRecord | None:
    """Returns the key record for *key_id*, or ``None``."""
    row = (await db.execute(select(UserApiKey).where(UserApiKey.id == key_id))).scalar_one_or_none()
    return _to_record(row) if row is not None else None


async def delete_by_user_and_provider(db: AsyncSession, user_id: int, provider_id: int) -> bool:
    """Deletes the key for *(user_id, provider_id)*; returns ``False`` if absent."""
    row = (
        await db.execute(
            select(UserApiKey).where(
                UserApiKey.user_id == user_id,
                UserApiKey.provider_id == provider_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        return False
    await db.delete(row)
    await db.commit()
    return True


async def delete_by_id(db: AsyncSession, key_id: int) -> bool:
    """Deletes the key for *key_id*; returns ``False`` if absent."""
    row = (await db.execute(select(UserApiKey).where(UserApiKey.id == key_id))).scalar_one_or_none()
    if row is None:
        return False
    await db.delete(row)
    await db.commit()
    return True


async def upsert(
    db: AsyncSession,
    *,
    user_id: int,
    provider_id: int,
    provider_name: str,
    key_value: str,
    label: str | None,
) -> UserApiKeyRecord:
    """Creates or replaces the key for *(user_id, provider_id)*.

    Args:
        db: Active async database session.
        user_id: ID of the owning user.
        provider_id: PK of the provider row.
        provider_name: Provider identifier for the returned record.
        key_value: Pre-encrypted key value to persist.
        label: Optional human-readable label.

    Returns:
        The created or updated key as a domain record.
    """
    row = (
        await db.execute(
            select(UserApiKey).where(
                UserApiKey.user_id == user_id,
                UserApiKey.provider_id == provider_id,
            )
        )
    ).scalar_one_or_none()

    if row is not None:
        row.key_value = key_value
        row.label = label
        row.valid_at = None
        row.validation_error = None
    else:
        row = UserApiKey(
            user_id=user_id,
            provider_id=provider_id,
            label=label,
            key_value=key_value,
        )
        db.add(row)

    await db.commit()
    await db.refresh(row)
    return _to_record(row, provider_name)


async def save_validation(
    db: AsyncSession,
    key_id: int,
    *,
    valid_at: datetime | None,
    validation_error: str | None,
) -> None:
    """Persists the validation outcome on the key row for *key_id*."""
    row = (await db.execute(select(UserApiKey).where(UserApiKey.id == key_id))).scalar_one_or_none()
    if row is None:
        return
    row.valid_at = valid_at
    row.validation_error = validation_error
    await db.commit()
