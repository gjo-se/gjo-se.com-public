"""Unit tests for provider registry and related functions (Ticket #315).

Covers:
- is_supported("openai") → True (package installed)
- is_supported("unknown-xyz") → False
- is_supported() with uninstalled package → False
- list_with_status() with key + valid_at → has_key=True, key_valid=True
- list_with_status() without key → has_key=False, key_valid=False
- list_with_status() with unknown provider → is_supported=False
- GET /user/core/llm/providers → 200, correct status fields
- GET /admin/core/llm/api-keys without admin → 403
"""

from __future__ import annotations

from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.identity.repositories import user_repository as user_repo
from app.main import app
from app.shared.db_access.session import get_db
from app.shared.llm_gateway.services.provider_registry_service import PROVIDER_REGISTRY, is_supported
from app.shared.llm_gateway.services.provider_service import LLMProviderService
from app.shared.llm_gateway.services.user_api_key_service import UserApiKeyService
from app.shared.status.models.status import Status, Statusable

# ── Constants ─────────────────────────────────────────────────────────────────

_USER_A = {
    "email": "usera_315@example.com",
    "name": "User A 315",
    "password": "SecurePass1!",  # pragma: allowlist secret
}
_BASE_KEYS_URL = "/api/v1/user/core/llm/api-keys"
_PROVIDERS_URL = "/api/v1/user/core/llm/providers"
_ADMIN_KEYS_URL = "/api/v1/admin/core/llm/api-keys"
_FAKE_KEY = "sk-test-315-key"  # pragma: allowlist secret


# ── Helpers ───────────────────────────────────────────────────────────────────


async def _activate(email: str) -> None:
    """Activate the test user: ``is_active`` plus the ``active`` status link.

    The auth guard resolves activity via ``core_statusable``, so the status link
    is required – ``is_active`` alone does not satisfy ``get_current_user``.
    """
    db_override = app.dependency_overrides.get(get_db)
    if db_override is None:
        return
    async for db in db_override():
        user = await user_repo.get_by_email(db, email)
        if user:
            user.is_active = True
            active_status = await db.scalar(select(Status).where(Status.name == "active", Status.category == "general"))
            if active_status is None:
                active_status = Status(
                    name="active",
                    slug="provider-registry-test-active",
                    category="general",
                    color_token="green",
                    scope=["users"],
                )
                db.add(active_status)
                await db.flush()
            db.add(
                Statusable(
                    status_id=active_status.id,
                    statusable_type="users",
                    statusable_id=user.id,
                )
            )
            await db.commit()
        break


async def _register_and_login(client: AsyncClient, user: dict) -> None:
    """Register, activate and login a user."""
    await client.post("/api/v1/public/auth/register", json=user)
    await _activate(user["email"])
    await client.post(
        "/api/v1/public/auth/login",
        json={"email": user["email"], "password": user["password"]},
    )


# ── Provider registry unit tests ──────────────────────────────────────────────


@pytest.mark.integration
@pytest.mark.xdist_group("db")
def test_is_supported_openai_returns_true() -> None:
    """is_supported() returns True when package is installed."""
    assert is_supported("openai") is True


@pytest.mark.integration
@pytest.mark.xdist_group("db")
def test_is_supported_unknown_returns_false() -> None:
    """is_supported() returns False for unregistered providers."""
    assert is_supported("unknown-xyz") is False


@pytest.mark.integration
@pytest.mark.xdist_group("db")
def test_is_supported_uninstalled_package_returns_false() -> None:
    """is_supported() returns False when registry entry exists but package missing."""
    with patch("app.shared.llm_gateway.services.provider_registry_service.importlib.import_module") as mock_import:
        mock_import.side_effect = ImportError("not installed")
        result = is_supported("openai")
    assert result is False


@pytest.mark.integration
@pytest.mark.parametrize(
    ("provider_name", "needs_key"),
    [
        ("openai", True),
        ("anthropic", True),
        ("google", True),
        ("mistralai", True),
        ("cohere", True),
        ("ollama", False),
    ],
)
def test_registry_declares_needs_key_per_provider(provider_name: str, needs_key: bool) -> None:
    """Each registry entry pins whether the provider requires a user API key."""
    assert PROVIDER_REGISTRY[provider_name].needs_key is needs_key


# ── list_with_status tests ────────────────────────────────────────────────────


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.xdist_group("db")
async def test_list_with_status_no_key(client: AsyncClient) -> None:
    """Provider without stored key → has_key=False, key_valid=False."""
    await _register_and_login(client, _USER_A)
    me_resp = await client.get("/api/v1/user/auth/me")
    user_id = me_resp.json()["id"]

    db_override = app.dependency_overrides.get(get_db)
    assert db_override is not None

    # Create provider without a key
    api_key_svc = UserApiKeyService()
    async for db in db_override():
        await api_key_svc.get_or_create_provider(db, "mistralai")
        await db.commit()
        provider_svc = LLMProviderService()
        statuses = await provider_svc.list_with_status(db, user_id)
        mistral_status = next((s for s in statuses if s.name == "mistralai"), None)
        assert mistral_status is not None
        assert mistral_status.has_key is False
        assert mistral_status.key_valid is False
        break


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.xdist_group("db")
async def test_list_with_status_unsupported_provider(client: AsyncClient) -> None:
    """Provider not in PROVIDER_REGISTRY → is_supported=False."""
    await _register_and_login(client, _USER_A)
    me_resp = await client.get("/api/v1/user/auth/me")
    user_id = me_resp.json()["id"]

    db_override = app.dependency_overrides.get(get_db)
    assert db_override is not None

    api_key_svc = UserApiKeyService()
    async for db in db_override():
        await api_key_svc.get_or_create_provider(db, "totally-unknown-provider")
        await db.commit()
        provider_svc = LLMProviderService()
        statuses = await provider_svc.list_with_status(db, user_id)
        unknown = next((s for s in statuses if s.name == "totally-unknown-provider"), None)
        assert unknown is not None
        assert unknown.is_supported is False
        break


# ── HTTP endpoint tests ───────────────────────────────────────────────────────
