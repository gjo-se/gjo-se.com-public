"""Integration tests for ``taggable_service``.

Public interface only: scope validation (unknown / out-of-scope ids → 400) and
the persisted assignment against the real (container) database.
"""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.tagging.models.tag import Tag
from app.shared.tagging.services import taggable_service

pytestmark = pytest.mark.integration


def _tag(*, name: str, slug: str, scope: list[str] | None) -> Tag:
    """Build a minimal tag row."""
    return Tag(name=name, slug=slug, category="test", color_token="gray", scope=scope)


async def test_set_tags_rejects_unknown_tag_id(db_session: AsyncSession) -> None:
    """An id without a persisted tag yields a 400 HTTPException."""
    with pytest.raises(HTTPException) as excinfo:
        await taggable_service.set_tags(db_session, "fbf_skill", 1, [999_999])

    assert excinfo.value.status_code == 400


async def test_set_tags_rejects_out_of_scope_tag(db_session: AsyncSession) -> None:
    """A tag whose scope excludes the type yields a 400 HTTPException."""
    tag = _tag(name="Scoped", slug="scoped", scope=["other_type"])
    db_session.add(tag)
    await db_session.flush()

    with pytest.raises(HTTPException) as excinfo:
        await taggable_service.set_tags(db_session, "fbf_skill", 1, [tag.id])

    assert excinfo.value.status_code == 400


async def test_set_tags_persists_valid_assignment(db_session: AsyncSession) -> None:
    """A globally-available tag is assigned and returned by ``get_tags``."""
    tag = _tag(name="Global", slug="global", scope=None)
    db_session.add(tag)
    await db_session.flush()

    await taggable_service.set_tags(db_session, "fbf_skill", 7, [tag.id])
    rows = await taggable_service.get_tags(db_session, "fbf_skill", 7)

    assert [row.tag_id for row in rows] == [tag.id]
