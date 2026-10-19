"""Integration tests for ``search_term_repository``.

Verifies the scraper search-term access against the real (container) database:
create/lookup, active-only filter via the core status, reference counting,
update, delete and the missing-name guard. Public interface only.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project_freelancer_map import ProjectFreelancerMap
from app.fbf.repositories import search_term_repository
from app.shared.status.models.status import Status, Statusable

pytestmark = pytest.mark.integration


async def test_create_persists_search_term_retrievable_by_name(db_session: AsyncSession) -> None:
    """A created search term is retrievable by its unique name."""
    created = await search_term_repository.create(db_session, "AI Engineer")

    found = await search_term_repository.get_by_name(db_session, "AI Engineer")

    assert created.id is not None
    assert found is not None
    assert found.id == created.id


async def test_get_by_name_returns_none_for_unknown_name(db_session: AsyncSession) -> None:
    """An unknown name yields None (guard path)."""
    assert await search_term_repository.get_by_name(db_session, "Nicht vorhanden") is None


async def test_get_active_returns_only_terms_with_active_status(db_session: AsyncSession) -> None:
    """The active filter keeps only terms linked to an active core status."""
    active = await search_term_repository.create(db_session, "Aktiver Begriff")
    await search_term_repository.create(db_session, "Inaktiver Begriff")
    status = Status(name="active", slug="search-term-active", category="fbf", color_token="green")
    db_session.add(status)
    await db_session.flush()
    db_session.add(Statusable(status_id=status.id, statusable_type="fbf_search_term", statusable_id=active.id))
    await db_session.flush()

    rows = await search_term_repository.get_active(db_session)

    assert [row.name for row in rows] == ["Aktiver Begriff"]


async def test_get_all_with_counts_reports_reference_count(db_session: AsyncSession) -> None:
    """The reference count reflects the linked raw project rows."""
    term = await search_term_repository.create(db_session, "Gezaehlter Begriff")
    for suffix in ("a", "b"):
        db_session.add(
            ProjectFreelancerMap(
                external_id=f"ext-{suffix}",
                url=f"https://example.test/raw/{suffix}",
                title=f"Rohprojekt {suffix}",
                search_term_id=term.id,
                posted_at=datetime(2026, 1, 1, tzinfo=UTC),
                scraped_at=datetime(2026, 1, 2, tzinfo=UTC),
            )
        )
    await db_session.flush()

    rows = await search_term_repository.get_all_with_counts(db_session)

    counts = {row[0].name: row[1] for row in rows}
    assert counts == {"Gezaehlter Begriff": 2}


async def test_update_persists_new_name(db_session: AsyncSession) -> None:
    """A new name is persisted and retrievable afterwards."""
    term = await search_term_repository.create(db_session, "Alter Begriff")

    updated = await search_term_repository.update(db_session, term.id, "Neuer Begriff")

    assert updated is not None
    assert updated.name == "Neuer Begriff"
    assert await search_term_repository.get_by_name(db_session, "Neuer Begriff") is not None


async def test_delete_removes_search_term_row(db_session: AsyncSession) -> None:
    """Deleting a search term leaves no row behind."""
    term = await search_term_repository.create(db_session, "Zu loeschen")
    term_id = term.id

    await search_term_repository.delete(db_session, term_id)

    assert await search_term_repository.get_by_id(db_session, term_id) is None
