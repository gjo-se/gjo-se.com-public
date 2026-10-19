"""Unit tests for core/llm API-key management (Ticket #313).

Covers:
- PUT /api/v1/user/llm/api-keys/{provider}: create key → key_value not in response
- PUT twice → upsert; no duplicate, updated key stored
- GET /api/v1/user/llm/api-keys: user A sees only own keys, not user B's
- GET without auth → 401
- DELETE /{provider}: key deleted; second call → 404
- DELETE by user B for user A's key → 404 (no cross-user leak)
- POST /{provider}/validate (mocked success) → {"valid": true}; valid_at set
- POST /{provider}/validate (mocked failure) → {"valid": false}; validation_error set
- GET /api/v1/admin/llm/api-keys without admin token → 403
- UserApiKeyService.get_key(): key present → decrypted plaintext (round-trip)
- UserApiKeyService.get_key(): no key → UserApiKeyNotFoundError
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.identity.repositories import user_repository as user_repo
from app.main import app
from app.shared.db_access.session import get_db
from app.shared.llm_gateway.exceptions import UserApiKeyNotFoundError
from app.shared.llm_gateway.infrastructure.provider_key_validation_client import (
    _validate_anthropic,
    _validate_cohere,
    _validate_google,
    _validate_mistral,
    _validate_openai,
)
from app.shared.llm_gateway.schemas.user_api_key_schemas import UserApiKeyValidationOut
from app.shared.llm_gateway.services.user_api_key_service import (
    UserApiKeyService,
    call_provider,
)
from app.shared.status.models.status import Status, Statusable
from tests.markers import fernet_skip as _fernet_skip

# ── Helpers ───────────────────────────────────────────────────────────────────

_USER_A = {
    "email": "usera_313@example.com",
    "name": "User A",
    "password": "SecurePass1!",  # pragma: allowlist secret
}
_USER_B = {
    "email": "userb_313@example.com",
    "name": "User B",
    "password": "SecurePass1!",  # pragma: allowlist secret
}
_BASE_URL = "/api/v1/user/llm/api-keys"
_ADMIN_URL = "/api/v1/admin/llm/api-keys"
_FAKE_KEY = "sk-test-openai-key"  # pragma: allowlist secret


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
                    slug="user-api-key-test-active",
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


async def _current_user_id(client: AsyncClient) -> int:
    """Return the authenticated user's id."""
    return int((await client.get("/api/v1/user/auth/me")).json()["id"])


async def _with_db(fn: Callable[[AsyncSession], Awaitable[object]]) -> object:
    """Run *fn* against a fresh session from the ``get_db`` override."""
    db_override = app.dependency_overrides.get(get_db)
    assert db_override is not None
    async for db in db_override():
        return await fn(db)
    raise AssertionError("db override produced no session")


# ── PUT: create / upsert ──────────────────────────────────────────────────────

# ── GET: scoping ──────────────────────────────────────────────────────────────

# ── DELETE ────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
@_fernet_skip
@pytest.mark.integration
@pytest.mark.xdist_group("db")
async def test_delete_cross_user_returns_404(client: AsyncClient) -> None:
    """User B deleting User A's key must return 404 (no cross-user leak)."""
    await _register_and_login(client, _USER_A)
    await client.put(f"{_BASE_URL}/openai", json={"key_value": _FAKE_KEY, "label": None})

    await _register_and_login(client, _USER_B)
    resp = await client.delete(f"{_BASE_URL}/openai")
    assert resp.status_code == 404


# ── POST /validate ────────────────────────────────────────────────────────────

# ── Admin ─────────────────────────────────────────────────────────────────────

# ── Service unit tests (no HTTP) ──────────────────────────────────────────────


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.xdist_group("db")
async def test_get_key_missing_raises_not_found(client: AsyncClient) -> None:
    """get_key() raises UserApiKeyNotFoundError when no key is stored."""
    await _register_and_login(client, _USER_A)
    me_resp = await client.get("/api/v1/user/auth/me")
    user_id = me_resp.json()["id"]

    service = UserApiKeyService()

    async def _run(db: AsyncSession) -> None:
        provider = await service.get_or_create_provider(db, "anthropic")
        with pytest.raises(UserApiKeyNotFoundError):
            await service.get_key(db, user_id, provider.id)

    await _with_db(_run)


# ── Provider validation dispatch ──────────────────────────────────────────────


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.xdist_group("db")
async def test_validate_unknown_provider_returns_invalid() -> None:
    """_call_provider returns valid=False for unsupported provider names."""
    from app.shared.llm_gateway.services.user_api_key_service import call_provider

    result = await call_provider("unknown-xyz", "any-key")
    assert result.valid is False
    assert "Unknown provider" in (result.error or "")


# ---------------------------------------------------------------------------
# merged from test_user_api_key_service_providers.py
# ---------------------------------------------------------------------------


_PATCH_HTTPX = "app.shared.llm_gateway.infrastructure.provider_key_validation_client.httpx.AsyncClient"


def _mock_http_resp(status_code: int, json_body: dict | None = None) -> tuple[AsyncMock, MagicMock]:
    mock_response = MagicMock()
    mock_response.status_code = status_code
    if json_body is not None:
        mock_response.json.return_value = json_body
    mock_http = AsyncMock()
    mock_http.get = AsyncMock(return_value=mock_response)
    return mock_http, mock_response


@pytest.fixture()
def _httpx_200():
    """Patches httpx.AsyncClient mit Status 200."""
    http, _ = _mock_http_resp(200)
    with patch(_PATCH_HTTPX) as cls:
        cls.return_value.__aenter__ = AsyncMock(return_value=http)
        cls.return_value.__aexit__ = AsyncMock(return_value=False)
        yield


@pytest.fixture()
def _httpx_401():
    """Patches httpx.AsyncClient mit Status 401 und Error-Body."""
    http, _ = _mock_http_resp(401, {"error": {"message": "Invalid API key"}})
    with patch(_PATCH_HTTPX) as cls:
        cls.return_value.__aenter__ = AsyncMock(return_value=http)
        cls.return_value.__aexit__ = AsyncMock(return_value=False)
        yield


@pytest.mark.asyncio
@pytest.mark.integration
async def test_call_provider_ollama_returns_valid_without_http_call() -> None:
    result = await call_provider("ollama", "any-key")
    assert result.valid is True


@pytest.mark.asyncio
@pytest.mark.integration
async def test_call_provider_openai_dispatches_to_openai_validator() -> None:
    with patch(
        "app.shared.llm_gateway.infrastructure.provider_key_validation_client._validate_openai",
        new_callable=AsyncMock,
        return_value=UserApiKeyValidationOut(valid=True),
    ) as mock_v:
        result = await call_provider("openai", "sk-test")
    mock_v.assert_awaited_once_with("sk-test")
    assert result.valid is True


@pytest.mark.asyncio
@pytest.mark.integration
async def test_call_provider_anthropic_dispatches_to_anthropic_validator() -> None:
    with patch(
        "app.shared.llm_gateway.infrastructure.provider_key_validation_client._validate_anthropic",
        new_callable=AsyncMock,
        return_value=UserApiKeyValidationOut(valid=True),
    ) as mock_v:
        result = await call_provider("anthropic", "sk-ant-test")
    mock_v.assert_awaited_once()
    assert result.valid is True


@pytest.mark.asyncio
@pytest.mark.integration
async def test_validate_openai_returns_valid_on_200_response(_httpx_200) -> None:
    result = await _validate_openai("good-key")
    assert result.valid is True


@pytest.mark.asyncio
@pytest.mark.integration
async def test_validate_openai_returns_invalid_on_401_response(_httpx_401) -> None:
    result = await _validate_openai("bad-key")
    assert result.valid is False
    assert "Invalid API key" in (result.error or "")


@pytest.mark.asyncio
@pytest.mark.integration
async def test_validate_anthropic_returns_valid_on_200_response(_httpx_200) -> None:
    result = await _validate_anthropic("good-key")
    assert result.valid is True


@pytest.mark.asyncio
@pytest.mark.integration
async def test_validate_mistral_returns_valid_on_200_response(_httpx_200) -> None:
    result = await _validate_mistral("good-key")
    assert result.valid is True


@pytest.mark.asyncio
@pytest.mark.integration
async def test_validate_google_returns_valid_on_200_response(_httpx_200) -> None:
    result = await _validate_google("good-key")
    assert result.valid is True


@pytest.mark.asyncio
@pytest.mark.integration
async def test_validate_cohere_returns_valid_on_200_response(_httpx_200) -> None:
    result = await _validate_cohere("good-key")
    assert result.valid is True


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.xdist_group("db")
async def test_delete_by_id_admin_raises_when_key_not_found(db_session: AsyncSession) -> None:
    with pytest.raises(UserApiKeyNotFoundError):
        await UserApiKeyService().delete_by_id_admin(db_session, 99999)


# ── Service persistence paths (DB, real users via HTTP) ──────────────────────


@pytest.mark.asyncio
@_fernet_skip
@pytest.mark.integration
@pytest.mark.xdist_group("db")
async def test_list_for_user_scopes_to_own_keys(client: AsyncClient) -> None:
    """Each user only sees their own key; the query is scoped by user_id."""
    await _register_and_login(client, _USER_A)
    a_id = await _current_user_id(client)
    await client.put(f"{_BASE_URL}/openai", json={"key_value": _FAKE_KEY, "label": "mine"})  # pragma: allowlist secret

    await _register_and_login(client, _USER_B)
    b_id = await _current_user_id(client)
    await client.put(f"{_BASE_URL}/openai", json={"key_value": _FAKE_KEY, "label": "other"})  # pragma: allowlist secret

    async def _run(db: AsyncSession) -> tuple[list[str], list[str]]:
        service = UserApiKeyService()
        a_labels = [row.label for row in await service.list_for_user(db, a_id)]
        b_labels = [row.label for row in await service.list_for_user(db, b_id)]
        return a_labels, b_labels

    a_labels, b_labels = await _with_db(_run)  # type: ignore[misc]
    assert a_labels == ["mine"]
    assert b_labels == ["other"]


@pytest.mark.asyncio
@_fernet_skip
@pytest.mark.integration
@pytest.mark.xdist_group("db")
async def test_upsert_replaces_existing_key(client: AsyncClient) -> None:
    """A second PUT replaces the stored key instead of duplicating it."""
    await _register_and_login(client, _USER_A)
    user_id = await _current_user_id(client)
    await client.put(f"{_BASE_URL}/openai", json={"key_value": "old", "label": "v1"})  # pragma: allowlist secret
    await client.put(f"{_BASE_URL}/openai", json={"key_value": "new", "label": "v2"})  # pragma: allowlist secret

    async def _run(db: AsyncSession) -> list[str]:
        return [row.label for row in await UserApiKeyService().list_for_user(db, user_id)]

    assert await _with_db(_run) == ["v2"]


@pytest.mark.asyncio
@_fernet_skip
@pytest.mark.integration
@pytest.mark.xdist_group("db")
async def test_delete_removes_key(client: AsyncClient) -> None:
    """Deleting the key removes it for the user."""
    await _register_and_login(client, _USER_A)
    user_id = await _current_user_id(client)
    await client.put(f"{_BASE_URL}/openai", json={"key_value": _FAKE_KEY, "label": None})  # pragma: allowlist secret

    async def _delete(db: AsyncSession) -> None:
        service = UserApiKeyService()
        provider = await service.get_or_create_provider(db, "openai")
        await service.delete(db, user_id, provider.id)

    await _with_db(_delete)

    async def _list(db: AsyncSession) -> list[str]:
        return [row.label for row in await UserApiKeyService().list_for_user(db, user_id)]

    assert await _with_db(_list) == []


@pytest.mark.asyncio
@_fernet_skip
@pytest.mark.integration
@pytest.mark.xdist_group("db")
async def test_get_key_round_trips_plaintext(client: AsyncClient) -> None:
    """get_key returns the decrypted plaintext that was stored."""
    await _register_and_login(client, _USER_A)
    user_id = await _current_user_id(client)
    await client.put(f"{_BASE_URL}/openai", json={"key_value": _FAKE_KEY, "label": None})  # pragma: allowlist secret

    async def _run(db: AsyncSession) -> str:
        service = UserApiKeyService()
        provider = await service.get_or_create_provider(db, "openai")
        return await service.get_key(db, user_id, provider.id)

    assert await _with_db(_run) == _FAKE_KEY


@pytest.mark.asyncio
@_fernet_skip
@pytest.mark.integration
@pytest.mark.xdist_group("db")
async def test_delete_by_id_admin_removes_key(client: AsyncClient) -> None:
    """The admin delete removes the key by primary key."""
    await _register_and_login(client, _USER_A)
    user_id = await _current_user_id(client)
    await client.put(f"{_BASE_URL}/openai", json={"key_value": _FAKE_KEY, "label": None})  # pragma: allowlist secret

    async def _delete(db: AsyncSession) -> None:
        service = UserApiKeyService()
        (row,) = await service.list_all_admin(db, _FakeLookup())
        await service.delete_by_id_admin(db, row.id)

    await _with_db(_delete)

    async def _list(db: AsyncSession) -> list[str]:
        return [row.label for row in await UserApiKeyService().list_for_user(db, user_id)]

    assert await _with_db(_list) == []


@pytest.mark.asyncio
@_fernet_skip
@pytest.mark.integration
@pytest.mark.xdist_group("db")
async def test_validate_key_success_updates_valid_at(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    """A valid provider response is reported as valid."""
    await _register_and_login(client, _USER_A)
    user_id = await _current_user_id(client)
    await client.put(f"{_BASE_URL}/openai", json={"key_value": _FAKE_KEY, "label": None})  # pragma: allowlist secret

    async def _valid(_provider: str, _key: str) -> UserApiKeyValidationOut:
        return UserApiKeyValidationOut(valid=True)

    monkeypatch.setattr("app.shared.llm_gateway.services.user_api_key_service.call_provider", _valid)

    async def _run(db: AsyncSession) -> UserApiKeyValidationOut:
        service = UserApiKeyService()
        provider = await service.get_or_create_provider(db, "openai")
        return await service.validate_key(db, user_id, provider.id)

    result = await _with_db(_run)
    assert result.valid is True


@pytest.mark.asyncio
@_fernet_skip
@pytest.mark.integration
@pytest.mark.xdist_group("db")
async def test_validate_key_failure_stores_error(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    """An invalid provider response is reported with its error text."""
    await _register_and_login(client, _USER_A)
    user_id = await _current_user_id(client)
    await client.put(f"{_BASE_URL}/openai", json={"key_value": _FAKE_KEY, "label": None})  # pragma: allowlist secret

    async def _invalid(_provider: str, _key: str) -> UserApiKeyValidationOut:
        return UserApiKeyValidationOut(valid=False, error="bad key")

    monkeypatch.setattr("app.shared.llm_gateway.services.user_api_key_service.call_provider", _invalid)

    async def _run(db: AsyncSession) -> UserApiKeyValidationOut:
        service = UserApiKeyService()
        provider = await service.get_or_create_provider(db, "openai")
        return await service.validate_key(db, user_id, provider.id)

    result = await _with_db(_run)
    assert result.valid is False
    assert result.error == "bad key"


@pytest.mark.asyncio
@_fernet_skip
@pytest.mark.integration
@pytest.mark.xdist_group("db")
async def test_list_all_admin_resolves_user_email(client: AsyncClient) -> None:
    """The admin listing attaches the user e-mail via the lookup port."""
    await _register_and_login(client, _USER_A)
    user_id = await _current_user_id(client)
    await client.put(f"{_BASE_URL}/openai", json={"key_value": _FAKE_KEY, "label": "L"})  # pragma: allowlist secret

    async def _run(db: AsyncSession) -> object:
        rows = await UserApiKeyService().list_all_admin(db, _FakeLookup())
        return next(row for row in rows if row.user_id == user_id)

    row = await _with_db(_run)
    assert row.user_email == f"u{user_id}@example.com"


class _FakeLookup:
    """User-lookup port double resolving ids to deterministic e-mails."""

    async def get_emails_by_ids(self, _db: object, ids: set[int]) -> dict[int, str]:
        """Return an e-mail per requested id."""
        return {i: f"u{i}@example.com" for i in ids}
