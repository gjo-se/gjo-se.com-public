"""Integration tests for ``project_repository``.

Verifies the central list/filter/status seam against the real (container)
database: ``get_all`` (filter, sort, read-model projection incl. status join and
slave count), ``count``, ``get_detail`` (hit/miss) and ``set_status`` (status
transition). Public interface only.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.job_role import JobRole
from app.fbf.models.project import Project
from app.fbf.repositories import project_repository
from app.fbf.repositories.project_repository import ProjectFilter
from app.shared.status.models.status import Statusable
from tests.reference_seed import ReferenceSeedData

pytestmark = pytest.mark.integration

_JAN = datetime(2026, 1, 1, tzinfo=UTC)
_FEB = datetime(2026, 2, 1, tzinfo=UTC)


def _project(url_suffix: str, title: str, posted_at: datetime, canonical_id: int | None = None) -> Project:
    """Build a project entity (helper keeps the arrange blocks compact)."""
    return Project(
        url=f"https://example.test/projects/{url_suffix}",
        title=title,
        posted_at=posted_at,
        canonical_id=canonical_id,
    )


async def test_get_all_returns_sorted_read_models_with_status_and_slave_count(
    reference_seed: ReferenceSeedData,
    db_session: AsyncSession,
) -> None:
    """Projects come sorted by posted_at desc; status and slave count are projected."""
    favorite = reference_seed["project"]["favorite"]
    older = _project("older", "Alpha Developer", _JAN)
    newer = _project("newer", "Beta Developer", _FEB)
    db_session.add_all([older, newer])
    await db_session.flush()
    db_session.add(_project("slave", "Alpha Duplicate", _JAN, canonical_id=older.id))
    db_session.add(Statusable(status_id=favorite.id, statusable_type="project", statusable_id=newer.id))
    await db_session.flush()

    rows = await project_repository.get_all(db_session, ProjectFilter())

    assert [row.project.title for row in rows] == ["Beta Developer", "Alpha Developer"]
    by_title = {row.project.title: row for row in rows}
    assert by_title["Beta Developer"].status == "favorite"
    assert by_title["Beta Developer"].status_color_token == "yellow"
    assert by_title["Alpha Developer"].slave_count == 1


async def test_get_all_search_filter_narrows_to_matching_title(db_session: AsyncSession) -> None:
    """The ``q`` filter keeps only projects whose title matches the term."""
    db_session.add(_project("engineer", "Python Engineer", _JAN))
    db_session.add(_project("developer", "Java Developer", _FEB))
    await db_session.flush()

    rows = await project_repository.get_all(db_session, ProjectFilter(q="Engineer"))

    assert [row.project.title for row in rows] == ["Python Engineer"]


async def test_get_all_excludes_archived_unless_requested(
    reference_seed: ReferenceSeedData,
    db_session: AsyncSession,
) -> None:
    """Archived projects are hidden by default and only shown via include_archived."""
    archived_status = reference_seed["project"]["archived"]
    project = _project("archived", "Archiviertes Projekt", _JAN)
    db_session.add(project)
    await db_session.flush()
    db_session.add(Statusable(status_id=archived_status.id, statusable_type="project", statusable_id=project.id))
    await db_session.flush()

    default_rows = await project_repository.get_all(db_session, ProjectFilter())
    included_rows = await project_repository.get_all(db_session, ProjectFilter(include_archived=True))

    assert default_rows == []
    assert [row.project.title for row in included_rows] == ["Archiviertes Projekt"]


async def test_count_respects_search_and_archive_filters(
    reference_seed: ReferenceSeedData,
    db_session: AsyncSession,
) -> None:
    """The count mirrors the list filters (search term narrows, archived excluded)."""
    archived_status = reference_seed["project"]["archived"]
    db_session.add(_project("count-a", "Match Projekt", _JAN))
    db_session.add(_project("count-b", "Match Projekt II", _FEB))
    archived = _project("count-c", "Match Archiviert", _FEB)
    db_session.add(archived)
    await db_session.flush()
    db_session.add(Statusable(status_id=archived_status.id, statusable_type="project", statusable_id=archived.id))
    await db_session.flush()

    assert await project_repository.count(db_session, ProjectFilter(q="Match")) == 2


async def test_get_detail_projects_status_for_existing_project(
    reference_seed: ReferenceSeedData,
    db_session: AsyncSession,
) -> None:
    """get_detail returns the read-model with the resolved status projection."""
    applied = reference_seed["project"]["applied"]
    project = _project("detail", "Detail Projekt", _JAN)
    db_session.add(project)
    await db_session.flush()
    db_session.add(Statusable(status_id=applied.id, statusable_type="project", statusable_id=project.id))
    await db_session.flush()

    detail = await project_repository.get_detail(db_session, project.id)

    assert detail is not None
    assert detail.project.id == project.id
    assert detail.status == "applied"
    assert detail.status_color_token == "green"


async def test_get_detail_returns_none_for_missing_project(db_session: AsyncSession) -> None:
    """An unknown project id yields None instead of raising."""
    assert await project_repository.get_detail(db_session, 999_999) is None


async def test_set_status_transitions_and_replaces_existing_status(
    reference_seed: ReferenceSeedData,
    db_session: AsyncSession,
) -> None:
    """set_status persists the new status and replaces a previous assignment."""
    project = _project("set-status", "Status Projekt", _JAN)
    db_session.add(project)
    await db_session.flush()

    first = await project_repository.set_status(db_session, project.id, "favorite")
    second = await project_repository.set_status(db_session, project.id, "applied")
    resolved = await project_repository.get_detail(db_session, project.id)

    assert first is not None
    assert first.status == "favorite"
    assert second is not None
    assert second.status == "applied"
    assert resolved is not None
    assert resolved.status == "applied"


async def test_set_status_returns_none_for_missing_project(
    reference_seed: ReferenceSeedData,
    db_session: AsyncSession,
) -> None:
    """An unknown project id yields None and writes nothing."""
    assert await project_repository.set_status(db_session, 999_999, "favorite") is None


async def test_count_by_job_role_counts_referencing_projects(db_session: AsyncSession) -> None:
    """The Project owner counts only projects referencing the given job role."""
    role = JobRole(name="Zaehlrolle")
    other = JobRole(name="Andere Rolle")
    db_session.add_all([role, other])
    await db_session.flush()
    db_session.add_all(
        [
            Project(url="https://example.test/projects/jr-1", title="A", posted_at=_JAN, job_role_id=role.id),
            Project(url="https://example.test/projects/jr-2", title="B", posted_at=_JAN, job_role_id=role.id),
            Project(url="https://example.test/projects/jr-3", title="C", posted_at=_JAN, job_role_id=other.id),
        ]
    )
    await db_session.flush()

    assert await project_repository.count_by_job_role(db_session, role.id) == 2


async def test_count_by_job_role_ids_batches_and_omits_unreferenced(db_session: AsyncSession) -> None:
    """The batch count maps only roles that have referencing projects."""
    role = JobRole(name="Batch A")
    empty = JobRole(name="Batch B")
    db_session.add_all([role, empty])
    await db_session.flush()
    db_session.add(Project(url="https://example.test/projects/batch", title="P", posted_at=_JAN, job_role_id=role.id))
    await db_session.flush()

    counts = await project_repository.count_by_job_role_ids(db_session, [role.id, empty.id])

    assert counts == {role.id: 1}


async def test_count_by_job_role_ids_empty_input_returns_empty_mapping(db_session: AsyncSession) -> None:
    """An empty id list short-circuits to an empty mapping."""
    assert await project_repository.count_by_job_role_ids(db_session, []) == {}


async def test_reassign_job_role_repoints_references_and_reports_count(db_session: AsyncSession) -> None:
    """Reassignment moves all referencing projects to the target role."""
    source = JobRole(name="Quelle")
    target = JobRole(name="Ziel")
    db_session.add_all([source, target])
    await db_session.flush()
    db_session.add(
        Project(
            url="https://example.test/projects/reassign", title="Testprojekt", posted_at=_JAN, job_role_id=source.id
        )
    )
    await db_session.flush()

    moved = await project_repository.reassign_job_role(db_session, source.id, target.id)

    assert moved == 1
    assert await project_repository.count_by_job_role(db_session, source.id) == 0
    assert await project_repository.count_by_job_role(db_session, target.id) == 1
