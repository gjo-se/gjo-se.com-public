"""Unit tests for the Tag service validation paths (no DB access)."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any, cast

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access.service_helpers import resolve_unique_slug
from app.shared.tagging.domain.tagging_rules import ColorToken
from app.shared.tagging.services import tag_service

pytestmark = pytest.mark.integration

_VALID_TOKEN = next(iter(ColorToken)).value


def _tag(**over: Any) -> Any:
    """Build a tag-like object with sensible defaults."""
    base: dict[str, Any] = {
        "id": 1,
        "name": "A",
        "category": "general",
        "slug": "general-a",
        "color_token": _VALID_TOKEN,
        "description": None,
        "sort_order": 0,
        "scope": None,
    }
    base.update(over)
    return SimpleNamespace(**base)


def _patch(monkeypatch: pytest.MonkeyPatch, repo: Any, **fns: Any) -> None:
    """Patch repository functions on the module object held by the service."""
    for name, fn in fns.items():
        monkeypatch.setattr(repo, name, fn)


async def test_create_tag_rejects_invalid_color_token_before_db_access() -> None:
    """An unknown colour token fails with 400 without touching the session."""
    with pytest.raises(HTTPException) as exc_info:
        await tag_service.create_tag(
            cast(AsyncSession, None),
            name="X",
            category="general",
            color_token="magenta",
            description=None,
            sort_order=0,
        )

    assert exc_info.value.status_code == 400


async def test_list_tags_returns_usage_counts(monkeypatch: pytest.MonkeyPatch) -> None:
    """Every tag is returned paired with its usage count."""

    async def _get_all(_db: Any, **_k: Any) -> list[Any]:
        return [_tag(id=1), _tag(id=2)]

    async def _usage(_db: Any, tag_id: int) -> int:
        return {1: 3, 2: 0}[tag_id]

    _patch(monkeypatch, tag_service.tag_repository, get_all=_get_all)
    _patch(monkeypatch, tag_service.taggable_repository, get_usage_count=_usage)

    result = await tag_service.list_tags(None)

    assert [(t.id, c) for t, c in result] == [(1, 3), (2, 0)]


async def test_resolve_slug_returns_explicit_slug_when_free() -> None:
    """An explicit, unused slug is returned unchanged."""

    async def _false(*_a: Any, **_k: Any) -> bool:
        return False

    resolved = await resolve_unique_slug(
        _false, cast(AsyncSession, None), name="A", category="general", slug="custom", label="Tag"
    )

    assert resolved == "custom"


async def test_resolve_slug_raises_409_when_explicit_slug_taken() -> None:
    """An explicit slug that already exists raises 409."""

    async def _true(*_a: Any, **_k: Any) -> bool:
        return True

    with pytest.raises(HTTPException) as exc_info:
        await resolve_unique_slug(
            _true, cast(AsyncSession, None), name="A", category="general", slug="taken", label="Tag"
        )

    assert exc_info.value.status_code == 409


async def test_resolve_slug_generates_from_category_and_name() -> None:
    """Without an explicit slug the slug is derived from category and name."""

    async def _false(*_a: Any, **_k: Any) -> bool:
        return False

    resolved = await resolve_unique_slug(
        _false, cast(AsyncSession, None), name="Python", category="Skill", slug=None, label="Tag"
    )

    assert resolved == "skill-python"


async def test_create_tag_success_persists_derived_slug(monkeypatch: pytest.MonkeyPatch) -> None:
    """A valid new tag is created with a slug derived from category and name."""
    created: dict[str, Any] = {}

    async def _no_existing(*_a: Any, **_k: Any) -> None:
        return None

    async def _false(*_a: Any, **_k: Any) -> bool:
        return False

    async def _create(_db: Any, tag: Any) -> Any:
        created["tag"] = tag
        return tag

    _patch(
        monkeypatch,
        tag_service.tag_repository,
        get_by_name_and_category=_no_existing,
        slug_exists=_false,
        create=_create,
    )

    tag = await tag_service.create_tag(
        None, name="Python", category="skill", color_token=_VALID_TOKEN, description=None, sort_order=0
    )

    assert created["tag"].slug == "skill-python"
    assert tag.name == "Python"


async def test_create_tag_duplicate_name_category_raises_409(monkeypatch: pytest.MonkeyPatch) -> None:
    """An existing (name, category) pair raises 409."""

    async def _existing(*_a: Any, **_k: Any) -> Any:
        return _tag(id=9)

    _patch(monkeypatch, tag_service.tag_repository, get_by_name_and_category=_existing)

    with pytest.raises(HTTPException) as exc_info:
        await tag_service.create_tag(
            None, name="A", category="general", color_token=_VALID_TOKEN, description=None, sort_order=0
        )

    assert exc_info.value.status_code == 409


async def test_update_tag_not_found_raises_404(monkeypatch: pytest.MonkeyPatch) -> None:
    """Updating a missing tag raises 404."""

    async def _none(*_a: Any, **_k: Any) -> None:
        return None

    _patch(monkeypatch, tag_service.tag_repository, get_by_id=_none)

    with pytest.raises(HTTPException) as exc_info:
        await tag_service.update_tag(
            None, 1, name="B", category=None, color_token=None, description=None, sort_order=None
        )

    assert exc_info.value.status_code == 404


async def test_update_tag_rename_conflict_raises_409(monkeypatch: pytest.MonkeyPatch) -> None:
    """Renaming onto another existing (name, category) raises 409."""

    async def _get_by_id(*_a: Any, **_k: Any) -> Any:
        return _tag(id=1, name="A")

    async def _conflict(*_a: Any, **_k: Any) -> Any:
        return _tag(id=2, name="B")

    _patch(monkeypatch, tag_service.tag_repository, get_by_id=_get_by_id, get_by_name_and_category=_conflict)

    with pytest.raises(HTTPException) as exc_info:
        await tag_service.update_tag(
            None, 1, name="B", category=None, color_token=None, description=None, sort_order=None
        )

    assert exc_info.value.status_code == 409


async def test_update_tag_applies_partial_fields(monkeypatch: pytest.MonkeyPatch) -> None:
    """Provided fields are applied; omitted ones stay untouched."""

    async def _get_by_id(*_a: Any, **_k: Any) -> Any:
        return _tag(id=1, name="A", description=None, sort_order=0)

    async def _update(_db: Any, tag: Any) -> Any:
        return tag

    _patch(monkeypatch, tag_service.tag_repository, get_by_id=_get_by_id, update=_update)

    tag = await tag_service.update_tag(
        None, 1, name=None, category=None, color_token=None, description="neu", sort_order=7
    )

    assert tag.description == "neu"
    assert tag.sort_order == 7
    assert tag.name == "A"


async def test_update_tag_slug_conflict_raises_409(monkeypatch: pytest.MonkeyPatch) -> None:
    """A new slug that already exists raises 409."""

    async def _get_by_id(*_a: Any, **_k: Any) -> Any:
        return _tag(id=1, slug="general-a")

    async def _exists(*_a: Any, **_k: Any) -> bool:
        return True

    _patch(monkeypatch, tag_service.tag_repository, get_by_id=_get_by_id, slug_exists=_exists)

    with pytest.raises(HTTPException) as exc_info:
        await tag_service.update_tag(
            None, 1, name=None, category=None, color_token=None, description=None, sort_order=None, slug="taken"
        )

    assert exc_info.value.status_code == 409


async def test_delete_tag_not_found_raises_404(monkeypatch: pytest.MonkeyPatch) -> None:
    """Deleting a missing tag raises 404."""

    async def _none(*_a: Any, **_k: Any) -> None:
        return None

    _patch(monkeypatch, tag_service.tag_repository, get_by_id=_none)

    with pytest.raises(HTTPException) as exc_info:
        await tag_service.delete_tag(None, 1)

    assert exc_info.value.status_code == 404


async def test_delete_tag_in_use_raises_409(monkeypatch: pytest.MonkeyPatch) -> None:
    """Deleting a tag that is still in use raises 409."""

    async def _get_by_id(*_a: Any, **_k: Any) -> Any:
        return _tag(id=1)

    async def _count(*_a: Any, **_k: Any) -> int:
        return 2

    _patch(monkeypatch, tag_service.tag_repository, get_by_id=_get_by_id)
    _patch(monkeypatch, tag_service.taggable_repository, get_usage_count=_count)

    with pytest.raises(HTTPException) as exc_info:
        await tag_service.delete_tag(None, 1)

    assert exc_info.value.status_code == 409


async def test_delete_tag_success_calls_repository(monkeypatch: pytest.MonkeyPatch) -> None:
    """An unused tag is deleted via the repository."""
    deleted: dict[str, Any] = {}

    async def _get_by_id(*_a: Any, **_k: Any) -> Any:
        return _tag(id=1)

    async def _zero(*_a: Any, **_k: Any) -> int:
        return 0

    async def _delete(_db: Any, tag: Any) -> None:
        deleted["tag"] = tag

    _patch(monkeypatch, tag_service.tag_repository, get_by_id=_get_by_id, delete=_delete)
    _patch(monkeypatch, tag_service.taggable_repository, get_usage_count=_zero)

    await tag_service.delete_tag(None, 1)

    assert deleted["tag"].id == 1
