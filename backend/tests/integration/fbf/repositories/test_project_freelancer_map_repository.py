"""Integration tests for ``project_freelancer_map_repository``.

Verifies the raw freelancermap access seam against the real (container)
database: create + lookup, list/count filters (search text, SearchTerm) and the
delta cutoff. Public interface only.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.search_term import SearchTerm
from app.fbf.repositories import project_freelancer_map_repository
from app.fbf.repositories.project_freelancer_map_repository import (
    ProjectFreelancerMapFilter,
)

pytestmark = pytest.mark.integration

_JAN1 = datetime(2026, 1, 1, tzinfo=UTC)
_JAN5 = datetime(2026, 1, 5, tzinfo=UTC)
_JAN9 = datetime(2026, 1, 9, tzinfo=UTC)


async def test_create_persists_row_retrievable_by_url_and_id(db_session: AsyncSession) -> None:
    """A created raw project is retrievable by its unique url and its id."""
    created = await project_freelancer_map_repository.create(
        db_session,
        external_id="ext-1",
        url="https://example.test/raw/1",
        title="Rohprojekt",
        posted_at=_JAN1,
        scraped_at=_JAN5,
    )

    by_url = await project_freelancer_map_repository.get_by_url(db_session, "https://example.test/raw/1")
    by_id = await project_freelancer_map_repository.get_by_id(db_session, created.id)

    assert created.id is not None
    assert by_url is not None
    assert by_url.id == created.id
    assert by_id is not None
    assert by_id.external_id == "ext-1"


async def test_get_all_and_count_apply_search_and_term_filters(db_session: AsyncSession) -> None:
    """Search text and SearchTerm filter narrow the list consistently with the count."""
    term = SearchTerm(name="AI Engineer")
    db_session.add(term)
    await db_session.flush()
    await project_freelancer_map_repository.create(
        db_session,
        external_id="ext-a",
        url="https://example.test/raw/a",
        title="Python Engineer",
        posted_at=_JAN1,
        scraped_at=_JAN5,
        search_term_id=term.id,
    )
    await project_freelancer_map_repository.create(
        db_session,
        external_id="ext-b",
        url="https://example.test/raw/b",
        title="Java Developer",
        posted_at=_JAN5,
        scraped_at=_JAN9,
        search_term_id=term.id,
    )
    await project_freelancer_map_repository.create(
        db_session,
        external_id="ext-c",
        url="https://example.test/raw/c",
        title="Python Data Scientist",
        posted_at=_JAN9,
        scraped_at=_JAN9,
    )

    by_search = await project_freelancer_map_repository.get_all(db_session, ProjectFreelancerMapFilter(q="Python"))
    by_term = await project_freelancer_map_repository.get_all(
        db_session, ProjectFreelancerMapFilter(search_term_id=term.id)
    )
    count = await project_freelancer_map_repository.count(db_session, ProjectFreelancerMapFilter(q="Python"))

    assert {row.title for row in by_search} == {"Python Engineer", "Python Data Scientist"}
    assert {row.title for row in by_term} == {"Python Engineer", "Java Developer"}
    assert count == 2


async def test_get_cutoff_returns_latest_posted_at_or_none(db_session: AsyncSession) -> None:
    """The delta cutoff is the max posted_at for the term, None when empty."""
    term = SearchTerm(name="Delta Begriff")
    db_session.add(term)
    await db_session.flush()
    await project_freelancer_map_repository.create(
        db_session,
        external_id="ext-old",
        url="https://example.test/raw/old",
        title="Alt",
        posted_at=_JAN1,
        scraped_at=_JAN5,
        search_term_id=term.id,
    )
    await project_freelancer_map_repository.create(
        db_session,
        external_id="ext-new",
        url="https://example.test/raw/new",
        title="Neu",
        posted_at=_JAN9,
        scraped_at=_JAN9,
        search_term_id=term.id,
    )

    cutoff = await project_freelancer_map_repository.get_cutoff(db_session, term.id)

    assert cutoff == _JAN9
    assert await project_freelancer_map_repository.get_cutoff(db_session, 999_999) is None


async def test_delete_removes_row(db_session: AsyncSession) -> None:
    """Deleting a raw project leaves no row behind."""
    created = await project_freelancer_map_repository.create(
        db_session,
        external_id="ext-del",
        url="https://example.test/raw/del",
        title="Zu loeschen",
        posted_at=_JAN1,
        scraped_at=_JAN5,
    )
    created_id = created.id

    await project_freelancer_map_repository.delete(db_session, created_id)

    assert await project_freelancer_map_repository.get_by_id(db_session, created_id) is None
