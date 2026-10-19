"""Integration tests for the bilingual site-content service.

Covers ordering, the non-empty filter of the per-language map and the
create/update behaviour of ``upsert`` against the real Postgres test database.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.content_manager.models.site_content import SiteContent
from app.content_manager.services import site_content_service

pytestmark = [pytest.mark.integration, pytest.mark.xdist_group("db")]


async def _add_row(db: AsyncSession, key: str, language: str, value: str | None) -> None:
    """Persist a single site-content row."""
    db.add(SiteContent(key=key, language=language, value=value))
    await db.commit()


async def test_get_all_returns_rows_ordered_by_key_and_language(db_session: AsyncSession) -> None:
    """Rows come back sorted by key, then language."""
    await _add_row(db_session, "home.hero", "en", "Hello")
    await _add_row(db_session, "home.hero", "de", "Hallo")
    await _add_row(db_session, "about.title", "de", "Ueber")

    result = await site_content_service.get_all(db_session)

    assert [(row.key, row.language) for row in result] == [
        ("about.title", "de"),
        ("home.hero", "de"),
        ("home.hero", "en"),
    ]


async def test_get_by_language_returns_only_non_empty_values(db_session: AsyncSession) -> None:
    """Null and empty values are omitted from the language map."""
    await _add_row(db_session, "filled", "de", "Wert")
    await _add_row(db_session, "null-value", "de", None)
    await _add_row(db_session, "empty-value", "de", "")

    result = await site_content_service.get_by_language(db_session, "de")

    assert result == {"filled": "Wert"}


async def test_get_by_language_returns_empty_mapping_for_unknown_language(db_session: AsyncSession) -> None:
    """A language without rows yields an empty mapping."""
    await _add_row(db_session, "only-de", "de", "Wert")

    assert await site_content_service.get_by_language(db_session, "fr") == {}


async def test_upsert_creates_missing_row(db_session: AsyncSession) -> None:
    """An unknown key/language pair is inserted."""
    result = await site_content_service.upsert(db_session, "home.headline", "de", "Hallo Welt")

    assert result.key == "home.headline"
    assert result.language == "de"
    assert result.value == "Hallo Welt"


async def test_upsert_updates_existing_row_value(db_session: AsyncSession) -> None:
    """An existing pair is updated in place and keeps its identity."""
    first = await site_content_service.upsert(db_session, "home.headline", "de", "Alt")
    second = await site_content_service.upsert(db_session, "home.headline", "de", "Neu")

    assert second.value == "Neu"
    assert second.key == first.key
    assert second.language == first.language
