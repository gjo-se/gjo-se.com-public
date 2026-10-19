"""Integration tests for LLMModelService – assert_model_active + admin PATCH.

Real async DB / HTTP client. The OpenRouter data-sync is covered by
``tests/integration/shared/llm_gateway/services/test_model_sync_service.py``.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from httpx import AsyncClient

from app.identity.repositories import user_repository as user_repo
from app.main import app
from app.shared.db_access.session import get_db
from app.shared.llm_gateway.exceptions import LLMModelDisabledError
from app.shared.llm_gateway.models.model import LLMModel
from app.shared.llm_gateway.models.provider import LLMProvider
from app.shared.llm_gateway.services.model_service import LLMModelService

pytestmark = pytest.mark.integration

_ADMIN_MODELS_URL = "/api/v1/admin/core/llm/models"

_ADMIN_USER_316F = {
    "email": "admin_316f@example.com",
    "name": "Admin 316f",
    "password": "SecurePass1!",  # pragma: allowlist secret
}


@pytest.mark.asyncio
async def test_assert_model_active_inactive_raises_error(db_session) -> None:
    """assert_model_active raises LLMModelDisabledError for inactive model."""
    svc = LLMModelService()
    provider = LLMProvider(name="test_provider", display_name="Test")
    db_session.add(provider)
    await db_session.flush()
    now = datetime.now(UTC)
    model = LLMModel(
        openrouter_id="test/inactive-model",
        native_model_id="inactive-model",
        provider_id=provider.id,
        display_name="Inactive Model",
        active=False,
        first_seen_at=now,
        last_seen_at=now,
    )
    db_session.add(model)
    await db_session.commit()

    with pytest.raises(LLMModelDisabledError):
        await svc.assert_model_active(db_session, model.id)


@pytest.mark.asyncio
async def test_assert_model_active_active_passes(db_session) -> None:
    """assert_model_active raises no error for active model."""
    svc = LLMModelService()
    provider = LLMProvider(name="test_provider_active", display_name="Test Active")
    db_session.add(provider)
    await db_session.flush()
    now = datetime.now(UTC)
    model = LLMModel(
        openrouter_id="test/active-model",
        native_model_id="active-model",
        provider_id=provider.id,
        display_name="Active Model",
        active=True,
        first_seen_at=now,
        last_seen_at=now,
    )
    db_session.add(model)
    await db_session.commit()

    # Should not raise
    await svc.assert_model_active(db_session, model.id)


# ── Admin PATCH endpoint (real client + DB) ──────────────────────────────────


async def _activate(email: str) -> None:
    db_override = app.dependency_overrides.get(get_db)
    if db_override is None:
        return
    async for db in db_override():
        user = await user_repo.get_by_email(db, email)
        if user:
            user.is_active = True
            await db.commit()
        break


async def _register_and_login(client: AsyncClient, user: dict) -> None:
    await client.post("/api/v1/public/auth/register", json=user)
    await _activate(user["email"])
    await client.post(
        "/api/v1/public/auth/login",
        json={"email": user["email"], "password": user["password"]},
    )


async def _make_admin(email: str) -> None:
    db_override = app.dependency_overrides.get(get_db)
    if db_override is None:
        return
    async for db in db_override():
        user = await user_repo.get_by_email(db, email)
        if user:
            user.role = "admin"
            await db.commit()
        break


async def test_patch_endpoint_not_found(client: AsyncClient) -> None:
    """PATCH /admin/core/llm/models/99999 (nicht existent) → 404."""
    await _register_and_login(client, _ADMIN_USER_316F)
    await _make_admin(_ADMIN_USER_316F["email"])
    await client.post(
        "/api/v1/public/auth/login",
        json={
            "email": _ADMIN_USER_316F["email"],
            "password": _ADMIN_USER_316F["password"],
        },
    )

    resp = await client.patch(f"{_ADMIN_MODELS_URL}/99999", json={"is_locally_installed": True})

    assert resp.status_code == 404
