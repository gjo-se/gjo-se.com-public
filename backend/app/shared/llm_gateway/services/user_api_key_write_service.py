"""Write operations for user-scoped LLM provider API keys.

Composed into :class:`UserApiKeyService` via inheritance: provider resolution
plus create/replace of a user's encrypted provider key. The DB access lives in
:mod:`...repositories.user_api_key_repository`.
"""

from __future__ import annotations

from app.shared.config.config import settings
from app.shared.credential_store.infrastructure.credential_encryption_client import encrypt_credential
from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.domain.provider_contract import ProviderRecord
from app.shared.llm_gateway.repositories import user_api_key_repository
from app.shared.llm_gateway.schemas.user_api_key_schemas import UserApiKeyResponse, UserApiKeyUpsertIn
from app.shared.llm_gateway.services.provider_service import get_or_create_provider


class UserApiKeyWriteService:
    """Create/replace API keys and resolve their provider rows."""

    async def get_or_create_provider(self, db: AsyncSession, provider_name: str) -> ProviderRecord:
        """Return the provider record for *provider_name*, creating it if absent.

        Args:
            db: Active async database session.
            provider_name: Provider identifier, e.g. ``'openai'``.

        Returns:
            The existing or newly created provider as a domain record.
        """
        return await get_or_create_provider(db, provider_name)

    async def upsert(
        self,
        db: AsyncSession,
        user_id: int,
        provider_id: int,
        data: UserApiKeyUpsertIn,
        provider_name: str,
    ) -> UserApiKeyResponse:
        """Create or replace the key for *(user_id, provider_id)*.

        The plaintext *key_value* is encrypted before being persisted.
        A second call with a new key_value replaces the existing record.

        Args:
            db: Active async database session.
            user_id: ID of the owning user.
            provider_id: PK of the LLMProvider row.
            data: Upsert payload containing the plaintext key and optional label.
            provider_name: Provider name string for the response.

        Returns:
            The created or updated :class:`UserApiKeyResponse`.
        """
        encrypted = encrypt_credential(data.key_value, settings.LLM_CREDENTIALS_KEY)
        record = await user_api_key_repository.upsert(
            db,
            user_id=user_id,
            provider_id=provider_id,
            provider_name=provider_name,
            key_value=encrypted,
            label=data.label,
        )
        return UserApiKeyResponse(
            provider=provider_name,
            label=record.label,
            valid_at=record.valid_at,
            validation_error=record.validation_error,
            created_at=record.created_at,
        )
