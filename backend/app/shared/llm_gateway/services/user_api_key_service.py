"""Service layer for user-scoped LLM provider API-key management.

Reads and deletes keys and validates a stored key against its provider. The
DB access lives in :mod:`...repositories.user_api_key_repository`; the
write/provider helpers live in :class:`UserApiKeyWriteService`.
"""

from __future__ import annotations

from datetime import UTC, datetime

import structlog

from app.shared.config.config import settings
from app.shared.credential_store.infrastructure.credential_encryption_client import decrypt_credential
from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.exceptions import UserApiKeyNotFoundError
from app.shared.llm_gateway.infrastructure.provider_key_validation_client import call_provider
from app.shared.llm_gateway.repositories import user_api_key_repository
from app.shared.llm_gateway.schemas.user_api_key_schemas import (
    UserApiKeyAdminResponse,
    UserApiKeyResponse,
    UserApiKeyValidationOut,
)
from app.shared.llm_gateway.services.user_api_key_write_service import UserApiKeyWriteService
from app.shared.security.user_lookup import UserLookupPort

logger = structlog.get_logger(__name__)


class UserApiKeyService(UserApiKeyWriteService):
    """Manages encrypted LLM provider API keys scoped to individual users."""

    # ── Queries ───────────────────────────────────────────────────────────────

    async def list_for_user(self, db: AsyncSession, user_id: int) -> list[UserApiKeyResponse]:
        """Return all stored keys for *user_id* (never the decrypted value).

        Args:
            db: Active async database session.
            user_id: ID of the requesting user.

        Returns:
            List of :class:`UserApiKeyResponse` ordered by provider name.
        """
        records = await user_api_key_repository.list_for_user(db, user_id)
        return [
            UserApiKeyResponse(
                provider=record.provider_name or "",
                label=record.label,
                valid_at=record.valid_at,
                validation_error=record.validation_error,
                created_at=record.created_at,
            )
            for record in records
        ]

    async def list_all_admin(
        self,
        db: AsyncSession,
        user_lookup: UserLookupPort,
    ) -> list[UserApiKeyAdminResponse]:
        """Return all stored keys for all users (admin view, no key_value).

        The owning user's e-mail is resolved through the shared
        :class:`UserLookupPort` – ``shared`` never imports ``identity``.

        Args:
            db: Active async database session.
            user_lookup: Port resolving ``user_id -> email`` via the identity context.

        Returns:
            List of :class:`UserApiKeyAdminResponse` with user_id and user_email.
        """
        records = await user_api_key_repository.list_all(db)
        emails = await user_lookup.get_emails_by_ids(db, {record.user_id for record in records})
        return [
            UserApiKeyAdminResponse(
                id=record.id,
                provider=record.provider_name or "",
                label=record.label,
                valid_at=record.valid_at,
                validation_error=record.validation_error,
                created_at=record.created_at,
                user_id=record.user_id,
                user_email=emails.get(record.user_id, ""),
            )
            for record in records
        ]

    # ── Deletes ───────────────────────────────────────────────────────────────

    async def delete(self, db: AsyncSession, user_id: int, provider_id: int) -> None:
        """Delete the key for *(user_id, provider_id)*.

        Args:
            db: Active async database session.
            user_id: ID of the requesting user.
            provider_id: PK of the LLMProvider row.

        Raises:
            UserApiKeyNotFoundError: Key not found for this user/provider combination.
        """
        deleted = await user_api_key_repository.delete_by_user_and_provider(db, user_id, provider_id)
        if not deleted:
            raise UserApiKeyNotFoundError(f"No API key found for provider_id '{provider_id}' (user {user_id})")

    async def delete_by_id_admin(self, db: AsyncSession, key_id: int) -> None:
        """Admin: delete any key by primary key.

        Args:
            db: Active async database session.
            key_id: Primary key of the UserApiKey row to remove.

        Raises:
            UserApiKeyNotFoundError: No row with this id exists.
        """
        deleted = await user_api_key_repository.delete_by_id(db, key_id)
        if not deleted:
            raise UserApiKeyNotFoundError(f"No API key found with id {key_id}")

    # ── Read (decrypted) ──────────────────────────────────────────────────────

    async def get_key(self, db: AsyncSession, user_id: int, provider_id: int) -> str:
        """Return the decrypted plaintext API key for *(user_id, provider_id)*.

        Args:
            db: Active async database session.
            user_id: ID of the owning user.
            provider_id: PK of the LLMProvider row.

        Returns:
            Decrypted plaintext API key string.

        Raises:
            UserApiKeyNotFoundError: No key stored for this user/provider combination.
        """
        record = await user_api_key_repository.get_by_user_and_provider(db, user_id, provider_id)
        if record is None:
            raise UserApiKeyNotFoundError(f"No API key found for provider_id '{provider_id}' (user {user_id})")
        return decrypt_credential(record.key_value, settings.LLM_CREDENTIALS_KEY)

    # ── Validation ────────────────────────────────────────────────────────────

    async def validate_key(self, db: AsyncSession, user_id: int, provider_id: int) -> UserApiKeyValidationOut:
        """Perform a minimal provider API call to verify the stored key.

        Updates *valid_at* on success or *validation_error* on failure.

        Args:
            db: Active async database session.
            user_id: ID of the owning user.
            provider_id: PK of the LLMProvider row.

        Returns:
            :class:`UserApiKeyValidationOut` with ``valid`` flag and optional
            ``error`` string.

        Raises:
            UserApiKeyNotFoundError: No key stored for this user/provider combination.
        """
        record = await user_api_key_repository.get_by_user_and_provider(db, user_id, provider_id)
        if record is None:
            raise UserApiKeyNotFoundError(f"No API key found for provider_id '{provider_id}' (user {user_id})")

        plaintext = decrypt_credential(record.key_value, settings.LLM_CREDENTIALS_KEY)
        validation_result = await call_provider(record.provider_name or "", plaintext)

        if validation_result.valid:
            await user_api_key_repository.save_validation(
                db,
                record.id,
                valid_at=datetime.now(UTC),
                validation_error=None,
            )
        else:
            await user_api_key_repository.save_validation(
                db,
                record.id,
                valid_at=record.valid_at,
                validation_error=validation_result.error,
            )
        return validation_result
