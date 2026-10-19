"""Integration tests for ``tag_repository`` (real Postgres).

Public interface only: the CRUD/lookup helpers persist and read back the ``Tag``
record against the real (container) database.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.tagging.domain.tag_contract import TagDraft
from app.shared.tagging.repositories import tag_repository

pytestmark = pytest.mark.integration


def _draft(
    *,
    name: str = "Python",
    slug: str = "skill-python",
    category: str = "skill",
    sort_order: int = 0,
    scope: list[str] | None = None,
) -> TagDraft:
    """Build a minimal tag draft."""
    return TagDraft(
        name=name,
        slug=slug,
        category=category,
        color_token="gray",
        description=None,
        sort_order=sort_order,
        scope=scope,
    )


async def test_create_persists_and_get_by_id_reads_back(db_session: AsyncSession) -> None:
    """A created tag is persisted and readable by primary key."""
    created = await tag_repository.create(db_session, _draft())

    fetched = await tag_repository.get_by_id(db_session, created.id)

    assert fetched is not None
    assert fetched.slug == "skill-python"


async def test_get_by_id_returns_none_for_unknown_id(db_session: AsyncSession) -> None:
    """An unknown id yields no record."""
    assert await tag_repository.get_by_id(db_session, 999_999) is None


async def test_get_by_slug_returns_persisted_tag(db_session: AsyncSession) -> None:
    """The slug lookup finds the stored tag."""
    await tag_repository.create(db_session, _draft(name="Go", slug="skill-go"))

    found = await tag_repository.get_by_slug(db_session, "skill-go")

    assert found is not None
    assert found.name == "Go"


async def test_get_by_name_and_category_matches_both_fields(db_session: AsyncSession) -> None:
    """The lookup requires the exact (name, category) pair."""
    await tag_repository.create(db_session, _draft(name="Go", slug="skill-go"))

    found = await tag_repository.get_by_name_and_category(db_session, "Go", "skill")

    assert found is not None
    assert await tag_repository.get_by_name_and_category(db_session, "Go", "other") is None


async def test_get_all_orders_by_category_and_sort_order(db_session: AsyncSession) -> None:
    """All tags are returned ordered by category, sort_order, name."""
    await tag_repository.create(db_session, _draft(name="B", slug="skill-b", sort_order=2))
    await tag_repository.create(db_session, _draft(name="A", slug="skill-a", sort_order=1))

    rows = await tag_repository.get_all(db_session)

    assert [row.slug for row in rows] == ["skill-a", "skill-b"]


async def test_get_all_filters_by_taggable_type_scope(db_session: AsyncSession) -> None:
    """Only tags whose scope contains the taggable_type are returned."""
    await tag_repository.create(db_session, _draft(name="In", slug="in-scope", scope=["fbf_skill"]))
    await tag_repository.create(db_session, _draft(name="Out", slug="out-of-scope", scope=["other"]))

    rows = await tag_repository.get_all(db_session, taggable_type="fbf_skill")

    assert [row.slug for row in rows] == ["in-scope"]


async def test_get_by_category_returns_only_matching_category(db_session: AsyncSession) -> None:
    """The category lookup narrows to the requested category."""
    await tag_repository.create(db_session, _draft(name="Go", slug="skill-go", category="skill"))
    await tag_repository.create(db_session, _draft(name="Frei", slug="status-frei", category="status"))

    rows = await tag_repository.get_by_category(db_session, "skill")

    assert [row.slug for row in rows] == ["skill-go"]


async def test_get_name_id_mapping_maps_names_to_ids(db_session: AsyncSession) -> None:
    """The name→id mapping exposes the persisted tag."""
    created = await tag_repository.create(db_session, _draft(name="Go", slug="skill-go"))

    mapping = await tag_repository.get_name_id_mapping(db_session)

    assert mapping["Go"] == created.id


async def test_update_applies_mutable_fields(db_session: AsyncSession) -> None:
    """Mutations on the record are persisted back to the row."""
    created = await tag_repository.create(db_session, _draft())
    created.name = "Python 3"
    created.sort_order = 5

    await tag_repository.update(db_session, created)

    fetched = await tag_repository.get_by_id(db_session, created.id)
    assert fetched is not None
    assert fetched.name == "Python 3"
    assert fetched.sort_order == 5


async def test_delete_removes_tag_row(db_session: AsyncSession) -> None:
    """Deleting leaves no row behind."""
    created = await tag_repository.create(db_session, _draft())

    await tag_repository.delete(db_session, created)

    assert await tag_repository.get_by_id(db_session, created.id) is None


async def test_slug_exists_reports_persisted_slug(db_session: AsyncSession) -> None:
    """The slug probe distinguishes used from free slugs."""
    await tag_repository.create(db_session, _draft(slug="skill-python"))

    assert await tag_repository.slug_exists(db_session, "skill-python") is True
    assert await tag_repository.slug_exists(db_session, "unused") is False
