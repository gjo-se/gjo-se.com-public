"""Integration tests for ``status_repository`` against the container database.

Covers the lookup and CRUD core at the public interface: entity helpers
(``create``/``get_by_slug``/``get_by_name_and_category``/``get_all``) and the
service-boundary record helpers (``create_record``/``get_record_by_id``/
``get_by_name_for_type``).
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.status.models.status import Status
from app.shared.status.repositories import status_repository

pytestmark = pytest.mark.integration


async def test_create_and_get_by_slug(db_session: AsyncSession) -> None:
    """A created status is retrievable by its unique slug."""
    created = await status_repository.create(
        db_session,
        Status(name="active", slug="repo-active", category="general", color_token="green"),
    )

    found = await status_repository.get_by_slug(db_session, "repo-active")

    assert found is not None
    assert found.id == created.id


async def test_get_by_name_and_category(db_session: AsyncSession) -> None:
    """The ``(name, category)`` lookup resolves a single status."""
    await status_repository.create(
        db_session,
        Status(name="inactive", slug="repo-inactive", category="general", color_token="gray"),
    )

    found = await status_repository.get_by_name_and_category(db_session, "inactive", "general")

    assert found is not None
    assert found.slug == "repo-inactive"


async def test_get_by_name_and_category_returns_none_for_unknown(db_session: AsyncSession) -> None:
    """An unknown ``(name, category)`` pair yields no status."""
    assert await status_repository.get_by_name_and_category(db_session, "ghost", "general") is None


async def test_get_all_filters_by_category(db_session: AsyncSession) -> None:
    """The category filter narrows the ordered listing."""
    await status_repository.create(
        db_session, Status(name="active", slug="repo-cat-general", category="general", color_token="green")
    )
    await status_repository.create(
        db_session, Status(name="draft", slug="repo-cat-contact", category="contact", color_token="gray")
    )

    rows = await status_repository.get_all(db_session, category="contact")

    assert [row.slug for row in rows] == ["repo-cat-contact"]


async def test_create_record_and_get_record_by_id(db_session: AsyncSession) -> None:
    """The record helpers return the persisted scalar fields."""
    created = await status_repository.create_record(
        db_session,
        name="active",
        slug="repo-record",
        category="general",
        color_token="green",
        description="aktiver Datensatz",
        sort_order=1.0,
    )

    fetched = await status_repository.get_record_by_id(db_session, created.id)

    assert fetched is not None
    assert fetched.name == "active"
    assert fetched.sort_order == 1.0


async def test_get_by_name_for_type_respects_scope(db_session: AsyncSession) -> None:
    """A type-scoped status resolves by name for its statusable type."""
    await status_repository.create(
        db_session,
        Status(
            name="active",
            slug="repo-scoped",
            category="general",
            color_token="green",
            scope=["fbf_skill"],
        ),
    )

    found = await status_repository.get_by_name_for_type(db_session, "active", "fbf_skill")

    assert found is not None
    assert found.slug == "repo-scoped"
