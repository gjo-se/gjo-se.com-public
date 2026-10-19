"""Pydantic schemas for user-scoped API-key management."""

from datetime import datetime

from pydantic import BaseModel, Field


class UserApiKeyUpsertIn(BaseModel):
    """Request body for creating or replacing a user API key.

    Attributes:
        key_value: Plaintext API key supplied by the user; stored encrypted.
            May be empty for Ollama (no key required).
        label: Optional human-readable label for this key.
    """

    key_value: str = Field(default="", description="Plaintext API key")
    label: str | None = Field(default=None, description="Optional label")


class UserApiKeyResponse(BaseModel):
    """API-key metadata returned to the owning user – never exposes *key_value*.

    Attributes:
        provider: Provider identifier, e.g. 'openai'.
        label: Optional human-readable label.
        valid_at: Timestamp of last successful validation (None = never validated).
        validation_error: Error text from the last failed validation (None = no
            error recorded).
        created_at: Row creation timestamp.
    """

    provider: str
    label: str | None
    valid_at: datetime | None
    validation_error: str | None
    created_at: datetime


class UserApiKeyAdminResponse(UserApiKeyResponse):
    """Extends UserApiKeyResponse with user information for admin endpoints.

    Attributes:
        id: Primary key of the key row.
        user_id: ID of the owning user.
        user_email: E-mail address of the owning user.
    """

    id: int
    user_id: int
    user_email: str


class UserApiKeyAdminCreate(BaseModel):
    """Request body for admin creation of an API key for a user.

    Attributes:
        provider: Provider identifier, e.g. 'openai'.
        key_value: Plaintext API key supplied by the admin.
        label: Optional human-readable label for this key.
    """

    provider: str
    key_value: str = Field(description="Plaintext API key")
    label: str | None = Field(default=None, description="Optional label")


class UserApiKeyAdminUpdate(BaseModel):
    """Request body for admin update of an API key.

    Attributes:
        key_value: New API key (optional; if not provided, existing key is unchanged).
        label: New label value (optional).
    """

    key_value: str | None = Field(default=None, description="New plaintext API key (optional)")
    label: str | None = Field(default=None, description="New label (optional)")


class UserApiKeyValidationOut(BaseModel):
    """Result returned by the ``POST /{provider}/validate`` endpoint.

    Attributes:
        valid: True when the provider accepted the key.
        error: Error description when *valid* is False, else None.
    """

    valid: bool
    error: str | None = None
