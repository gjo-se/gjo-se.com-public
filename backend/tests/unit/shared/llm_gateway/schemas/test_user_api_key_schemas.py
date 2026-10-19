"""Unit tests for user_api_key_schemas.py – UserApiKey response schemas.

Covers:
- UserApiKeyUpsertIn creation and defaults
- UserApiKeyResponse field validation
- UserApiKeyAdminResponse extends UserApiKeyResponse
- UserApiKeyValidationOut valid/invalid states
"""

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.shared.llm_gateway.schemas.user_api_key_schemas import (
    UserApiKeyAdminResponse,
    UserApiKeyResponse,
    UserApiKeyUpsertIn,
    UserApiKeyValidationOut,
)


class TestUserApiKeyUpsert:
    """Tests for UserApiKeyUpsertIn request schema."""

    @pytest.mark.unit
    def test_upsert_with_key_and_label(self) -> None:
        """UserApiKeyUpsertIn accepts key_value and label."""
        schema = UserApiKeyUpsertIn(key_value="sk-abc123", label="prod-key")
        assert schema.key_value == "sk-abc123"
        assert schema.label == "prod-key"

    @pytest.mark.unit
    def test_upsert_defaults(self) -> None:
        """UserApiKeyUpsertIn defaults: key_value='' and label=None."""
        schema = UserApiKeyUpsertIn()
        assert schema.key_value == ""
        assert schema.label is None

    @pytest.mark.unit
    def test_upsert_empty_key_for_ollama(self) -> None:
        """UserApiKeyUpsertIn allows empty key_value (Ollama)."""
        schema = UserApiKeyUpsertIn(key_value="", label=None)
        assert schema.key_value == ""
        assert schema.label is None


class TestUserApiKeyResponse:
    """Tests for UserApiKeyResponse schema."""

    @pytest.mark.unit
    def test_response_with_all_fields(self) -> None:
        """UserApiKeyResponse with all fields populated."""
        now = datetime.now(UTC)
        schema = UserApiKeyResponse(
            provider="openai",
            label="my-key",
            valid_at=now,
            validation_error=None,
            created_at=now,
        )
        assert schema.provider == "openai"
        assert schema.label == "my-key"
        assert schema.valid_at == now
        assert schema.validation_error is None

    @pytest.mark.unit
    def test_response_without_optional_fields(self) -> None:
        """UserApiKeyResponse allows None for valid_at and validation_error."""
        now = datetime.now(UTC)
        schema = UserApiKeyResponse(
            provider="anthropic",
            label=None,
            valid_at=None,
            validation_error=None,
            created_at=now,
        )
        assert schema.provider == "anthropic"
        assert schema.label is None
        assert schema.valid_at is None

    @pytest.mark.unit
    def test_response_with_validation_error(self) -> None:
        """UserApiKeyResponse captures validation_error text."""
        now = datetime.now(UTC)
        schema = UserApiKeyResponse(
            provider="openai",
            label=None,
            valid_at=None,
            validation_error="Invalid API key",
            created_at=now,
        )
        assert schema.validation_error == "Invalid API key"

    @pytest.mark.unit
    def test_response_requires_provider(self) -> None:
        """UserApiKeyResponse raises ValidationError when provider is missing."""
        with pytest.raises(ValidationError):
            UserApiKeyResponse(
                label=None,
                valid_at=None,
                validation_error=None,
                created_at=datetime.now(UTC),
            )


class TestUserApiKeyAdminResponse:
    """Tests for UserApiKeyAdminResponse schema (extends UserApiKeyResponse)."""

    @pytest.mark.unit
    def test_admin_response_extends_base(self) -> None:
        """UserApiKeyAdminResponse includes id, user_id, user_email."""
        now = datetime.now(UTC)
        schema = UserApiKeyAdminResponse(
            provider="openai",
            label="admin-key",
            valid_at=now,
            validation_error=None,
            created_at=now,
            id=42,
            user_id=7,
            user_email="admin@example.com",
        )
        assert schema.id == 42
        assert schema.user_id == 7
        assert schema.user_email == "admin@example.com"
        assert schema.provider == "openai"

    @pytest.mark.unit
    def test_admin_response_is_subclass(self) -> None:
        """UserApiKeyAdminResponse is a subclass of UserApiKeyResponse."""
        assert issubclass(UserApiKeyAdminResponse, UserApiKeyResponse)


class TestUserApiKeyValidation:
    """Tests for UserApiKeyValidationOut schema."""

    @pytest.mark.unit
    def test_validation_result_valid(self) -> None:
        """UserApiKeyValidationOut with valid=True and no error."""
        result = UserApiKeyValidationOut(valid=True)
        assert result.valid is True
        assert result.error is None

    @pytest.mark.unit
    def test_validation_result_invalid_with_error(self) -> None:
        """UserApiKeyValidationOut with valid=False and error message."""
        result = UserApiKeyValidationOut(valid=False, error="Unauthorized")
        assert result.valid is False
        assert result.error == "Unauthorized"

    @pytest.mark.unit
    def test_validation_result_requires_valid(self) -> None:
        """UserApiKeyValidationOut raises ValidationError when valid is missing."""
        with pytest.raises(ValidationError):
            UserApiKeyValidationOut(error="some error")
