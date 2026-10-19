"""User- and admin-scoped LLM API-key management routes."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.config.config import settings
from app.shared.credential_store.infrastructure.credential_encryption_client import encrypt_credential
from app.shared.db_access.session import get_db
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_user_api_key_service
from app.shared.llm_gateway.exceptions import UserApiKeyNotFoundError
from app.shared.llm_gateway.models.api_key import UserApiKey
from app.shared.llm_gateway.schemas.user_api_key_schemas import (
    UserApiKeyAdminCreate,
    UserApiKeyAdminResponse,
    UserApiKeyAdminUpdate,
    UserApiKeyResponse,
    UserApiKeyUpsertIn,
    UserApiKeyValidationOut,
)
from app.shared.security.dependencies.auth_dependencies import AdminUser, UserUser
from app.shared.security.user_lookup import UserLookupPort, get_user_lookup_port

logger = structlog.get_logger(__name__)

user_router = APIRouter()
admin_router = APIRouter()


# ── User routes – API keys ─────────────────────────────────────────────────────


@user_router.put(
    "/{provider}",
    response_model=UserApiKeyResponse,
    summary="Create or replace an API key for a provider",
)
async def upsert_api_key(
    provider: str,
    body: UserApiKeyUpsertIn,
    current_user: UserUser,
    db: AsyncSession = Depends(get_db),
) -> UserApiKeyResponse:
    """Create a new API key or replace an existing one for the given provider.

    The provider is looked up in ``llm_provider`` by name; if absent it is
    created automatically.  Idempotent – calling twice with a new key_value
    silently replaces the previous entry.

    Args:
        provider: Provider identifier ('openai' | 'anthropic' | 'ollama' | …).
        body: Upsert payload with plaintext key and optional label.
        current_user: Authenticated user.
        db: Async database session.

    Returns:
        UserApiKeyResponse for the created or updated key.
    """
    provider_row = await get_user_api_key_service().get_or_create_provider(db, provider)
    return await get_user_api_key_service().upsert(
        db, current_user.id, provider_row.id, body, provider_name=provider_row.name
    )


@user_router.delete(
    "/{provider}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an API key for a provider",
)
async def delete_user_api_key(
    provider: str,
    current_user: UserUser,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete the stored API key for the given provider.

    Returns 204 on success.  Returns 404 when no key exists for this
    user/provider combination.

    Args:
        provider: Provider identifier.
        current_user: Authenticated user.
        db: Async database session.

    Raises:
        HTTPException 404: Key not found.
    """
    provider_row = await get_user_api_key_service().get_or_create_provider(db, provider)
    try:
        await get_user_api_key_service().delete(db, current_user.id, provider_row.id)
    except UserApiKeyNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@user_router.post(
    "/{provider}/validate",
    response_model=UserApiKeyValidationOut,
    summary="Validate the stored API key against the provider",
)
async def validate_api_key(
    provider: str,
    current_user: UserUser,
    db: AsyncSession = Depends(get_db),
) -> UserApiKeyValidationOut:
    """Perform a minimal provider API call to verify the stored key.

    Updates ``valid_at`` on success or ``validation_error`` on failure.

    Args:
        provider: Provider identifier.
        current_user: Authenticated user.
        db: Async database session.

    Returns:
        UserApiKeyValidationOut with ``valid`` flag and optional ``error`` text.

    Raises:
        HTTPException 404: No key stored for this provider.
    """
    provider_row = await get_user_api_key_service().get_or_create_provider(db, provider)
    try:
        return await get_user_api_key_service().validate_key(db, current_user.id, provider_row.id)
    except UserApiKeyNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


# ── Admin routes – API keys ────────────────────────────────────────────────────


@admin_router.get(
    "/api-keys",
    response_model=list[UserApiKeyAdminResponse],
    summary="[Admin] List all API keys for all users",
)
async def list_api_keys(
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
    user_lookup: UserLookupPort = Depends(get_user_lookup_port),
) -> list[UserApiKeyAdminResponse]:
    """Return all stored API-key metadata for every user (admin only).

    The ``key_value`` field is never included.

    Args:
        _admin: Admin user (injected, used only for auth guard).
        db: Async database session.
        user_lookup: User-lookup port resolving owner e-mails (injected).

    Returns:
        List of UserApiKeyAdminResponse objects.
    """
    return await get_user_api_key_service().list_all_admin(db, user_lookup)


@admin_router.post(
    "/api-keys",
    response_model=UserApiKeyAdminResponse,
    status_code=status.HTTP_201_CREATED,
    summary="[Admin] Create an API key for a user",
)
async def create_api_key(
    body: UserApiKeyAdminCreate,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
    user_lookup: UserLookupPort = Depends(get_user_lookup_port),
) -> UserApiKeyAdminResponse:
    """Create a new API key for a user (admin only).

    Args:
        body: Creation payload with provider, key_value, and optional label.
        _admin: Admin user (injected, used only for auth guard).
        db: Async database session.

    Returns:
        Created UserApiKeyAdminResponse.

    Raises:
        HTTPException 400: User not found or invalid provider.
        HTTPException 500: Database error.
    """

    # For admin creation, we need to know which user to create the key for.
    # The current implementation creates it for the admin themselves.
    # A production version would include user_id in the request body.
    try:
        # Get or create provider
        provider_row = await get_user_api_key_service().get_or_create_provider(db, body.provider)

        # For now, create the key for the admin user themselves
        # Ref #493: Allow specifying user_id in request body
        upsert_data = UserApiKeyUpsertIn(key_value=body.key_value, label=body.label)
        _ = await get_user_api_key_service().upsert(
            db,
            _admin.id,
            provider_row.id,
            upsert_data,
            provider_name=body.provider,
        )

        # Fetch the created key to return full admin response
        all_keys = await get_user_api_key_service().list_all_admin(db, user_lookup)
        # Return the most recent key for this provider and admin
        for key in reversed(all_keys):
            if key.provider == body.provider and key.user_id == _admin.id:
                return key

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Key created but could not be retrieved",
        )
    except Exception as exc:
        logger.exception("Admin API key creation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"API key creation failed: {exc!s}",
        ) from exc


@admin_router.put(
    "/api-keys/{key_id}",
    response_model=UserApiKeyAdminResponse,
    summary="[Admin] Update an API key",
)
async def update_api_key(
    key_id: int,
    body: UserApiKeyAdminUpdate,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
    user_lookup: UserLookupPort = Depends(get_user_lookup_port),
) -> UserApiKeyAdminResponse:
    """Update an existing API key (admin only).

    Args:
        key_id: Primary key of the API key to update.
        body: Update payload with optional key_value and label.
        _admin: Admin user (injected, used only for auth guard).
        db: Async database session.

    Returns:
        Updated UserApiKeyAdminResponse.

    Raises:
        HTTPException 404: Key not found.
        HTTPException 500: Database error.
    """
    try:
        # Fetch the existing key
        key_row = await db.get(UserApiKey, key_id)
        if not key_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"API key with id {key_id} not found",
            )

        # Update key_value if provided
        if body.key_value is not None:
            encrypted = encrypt_credential(body.key_value, settings.LLM_CREDENTIALS_KEY)
            key_row.key_value = encrypted
            # Reset validation status when key changes
            key_row.valid_at = None
            key_row.validation_error = None

        # Update label if provided
        if body.label is not None:
            key_row.label = body.label

        db.add(key_row)
        await db.commit()
        await db.refresh(key_row)

        # Return full admin response with user info
        all_keys = await get_user_api_key_service().list_all_admin(db, user_lookup)
        for key in all_keys:
            if key.id == key_id:
                return key

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Key updated but could not be retrieved",
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Admin API key update failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"API key update failed: {exc!s}",
        ) from exc


@admin_router.delete(
    "/api-keys/{key_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="[Admin] Delete an API key by ID",
)
async def delete_api_key(
    key_id: int,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete any stored API key by its primary key (emergency removal).

    Args:
        key_id: Primary key of the UserApiKey row.
        _admin: Admin user (injected, used only for auth guard).
        db: Async database session.

    Raises:
        HTTPException 404: No key with this id exists.
    """
    try:
        await get_user_api_key_service().delete_by_id_admin(db, key_id)
    except UserApiKeyNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
