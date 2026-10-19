"""Integration tests for ``taggable_repository`` (real Postgres).

Public interface only: the polymorphic junction set/read and the usage
aggregation against the real (container) database.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.tagging.domain.tag_contract import TagDraft
from app.shared.tagging.repositories import tag_repository, taggable_repository

pytestmark = pytest.mark.integration


async def _create_tag(db: AsyncSession, *, name: str, slug: str) -> int:
    """Persist a minimal tag and return its primary key."""
    record = await tag_repository.create(
        db,
        TagDraft(
            name=name,
            slug=slug,
            category="skill",
            color_token="gray",
            description=None,
            sort_order=0,
            scope=None,
        ),
    )
    return record.id


async def test_set_tags_persists_junction_and_get_tags_resolves_tag(db_session: AsyncSession) -> None:
    """A junction row is stored and read back with its resolved tag."""
    tag_id = await _create_tag(db_session, name="Python", slug="skill-python")

    await taggable_repository.set_tags(db_session, "fbf_skill", 42, [tag_id])
    rows = await taggable_repository.get_tags(db_session, "fbf_skill", 42)

    assert [row.tag_id for row in rows] == [tag_id]
    assert rows[0].tag.slug == "skill-python"


async def test_set_tags_replaces_existing_assignments(db_session: AsyncSession) -> None:
    """Re-assigning replaces the previous junction rows."""
    first = await _create_tag(db_session, name="A", slug="skill-a")
    second = await _create_tag(db_session, name="B", slug="skill-b")
    await taggable_repository.set_tags(db_session, "fbf_skill", 7, [first])

    await taggable_repository.set_tags(db_session, "fbf_skill", 7, [second])

    rows = await taggable_repository.get_tags(db_session, "fbf_skill", 7)
    assert [row.tag_id for row in rows] == [second]


async def test_set_tags_isolates_by_taggable_id(db_session: AsyncSession) -> None:
    """Assignments on one entity do not leak to another."""
    tag_id = await _create_tag(db_session, name="A", slug="skill-a")
    await taggable_repository.set_tags(db_session, "fbf_skill", 1, [tag_id])

    assert await taggable_repository.get_tags(db_session, "fbf_skill", 2) == []


async def test_get_usage_count_counts_linked_entities(db_session: AsyncSession) -> None:
    """The usage count reflects every linked entity."""
    tag_id = await _create_tag(db_session, name="A", slug="skill-a")
    await taggable_repository.set_tags(db_session, "fbf_skill", 1, [tag_id])
    await taggable_repository.set_tags(db_session, "project", 2, [tag_id])

    assert await taggable_repository.get_usage_count(db_session, tag_id) == 2


async def test_get_usage_by_tag_groups_by_type(db_session: AsyncSession) -> None:
    """Usage is aggregated per taggable_type, ordered by type."""
    tag_id = await _create_tag(db_session, name="A", slug="skill-a")
    await taggable_repository.set_tags(db_session, "fbf_skill", 1, [tag_id])
    await taggable_repository.set_tags(db_session, "fbf_skill", 2, [tag_id])
    await taggable_repository.set_tags(db_session, "project", 3, [tag_id])

    usage = await taggable_repository.get_usage_by_tag(db_session, tag_id)

    assert usage == [("fbf_skill", 2), ("project", 1)]
