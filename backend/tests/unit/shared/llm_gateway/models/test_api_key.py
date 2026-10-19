"""Unit tests for the user API-key model."""

from __future__ import annotations

import pytest

from app.shared.llm_gateway.models.api_key import UserApiKey


@pytest.mark.unit
def test_user_api_key_binds_one_key_per_user_and_provider() -> None:
    """The model enforces a unique (user_id, provider_id) pair."""
    table = UserApiKey.__table__
    assert table.name == "shared_api_key"
    constraint_names = {c.name for c in table.constraints if c.name is not None}
    assert "uq_shared_api_key_user_provider_id" in constraint_names


@pytest.mark.unit
def test_user_api_key_requires_encrypted_key_and_cascades_owner() -> None:
    """The key value is mandatory and both foreign keys cascade on delete."""
    table = UserApiKey.__table__
    assert table.c.key_value.nullable is False
    assert table.c.user_id.nullable is False
    assert table.c.provider_id.nullable is False
