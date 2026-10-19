"""Integration tests for the user API-key write operations."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.services.user_api_key_write_service import UserApiKeyWriteService


@pytest.mark.integration
async def test_get_or_create_provider_is_idempotent(db_session: AsyncSession) -> None:
    """Resolving the same provider twice returns the same row."""
    service = UserApiKeyWriteService()

    first = await service.get_or_create_provider(db_session, "write-mixin-provider")
    second = await service.get_or_create_provider(db_session, "write-mixin-provider")

    assert first.id == second.id
