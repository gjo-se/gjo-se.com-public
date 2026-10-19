"""Unit tests for the project read-side service (repository doubles, no DB).

``row_to_project_out`` is pure; the query functions read through the project and
skill repositories, which are doubled at the system boundary.
"""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.fbf.repositories.project_repository import ProjectFilter, ProjectRow
from app.fbf.repositories.skill_repository import SkillRef
from app.fbf.schemas.project_schemas import ProjectOut
from app.fbf.services import project_query_service as svc

pytestmark = pytest.mark.unit


class _DB:
    """Minimal async-session stand-in (only passed through to the doubles)."""


def _out(project_id: int = 1) -> ProjectOut:
    """Build a minimal ``ProjectOut`` for read-model rows."""
    return ProjectOut(
        id=project_id,
        url=f"https://example.test/{project_id}",
        title="Project",
        description=None,
        city=None,
        country=None,
        remote_percent=None,
        contract_type=None,
        duration=None,
        start_date=None,
        posted_at=None,
        scraped_at=None,
    )


def _skill(sid: int, name: str, *, importance: int, level: int, level_public: int) -> SkillRef:
    return SkillRef(
        id=sid,
        name=name,
        description=None,
        importance=importance,
        level=level,
        level_public=level_public,
        canonical_id=None,
        group_id=None,
        sort=None,
        vector=None,
    )


# ── row_to_project_out ───────────────────────────────────────────────────────


def test_row_to_project_out_copies_view_fields_from_read_model() -> None:
    row = ProjectRow(
        project=_out(7),
        status="active",
        status_color_token="green",
        freelancermap_id=42,
        slave_count=3,
    )

    out = svc.row_to_project_out(row)

    assert out.id == 7
    assert out.slave_count == 3
    assert out.status == "active"
    assert out.status_color_token == "green"
    assert out.freelancermap_id == 42


# ── list_slaves / list_all / count ───────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_slaves_projects_every_row(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _rows(_db: object, _master_id: int) -> list[ProjectRow]:
        return [ProjectRow(project=_out(1)), ProjectRow(project=_out(2))]

    monkeypatch.setattr(svc.project_repository, "get_slaves_rows", _rows)

    out = await svc.list_slaves(_DB(), 9)

    assert [p.id for p in out] == [1, 2]


@pytest.mark.asyncio
async def test_list_all_forwards_paging_and_projects_rows(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, object] = {}

    async def _all(
        _db: object,
        _filters: ProjectFilter,
        *,
        sort_by: str,
        sort_order: str,
        offset: int,
        limit: int,
    ) -> list[ProjectRow]:
        seen.update(sort_by=sort_by, sort_order=sort_order, offset=offset, limit=limit)
        return [ProjectRow(project=_out(1))]

    monkeypatch.setattr(svc.project_repository, "get_all", _all)

    out = await svc.list_all(_DB(), ProjectFilter(), offset=10, limit=5, sort_by="id", sort_order="asc")

    assert [p.id for p in out] == [1]
    assert seen == {"sort_by": "id", "sort_order": "asc", "offset": 10, "limit": 5}


@pytest.mark.asyncio
async def test_count_returns_repository_total(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _count(_db: object, _filters: ProjectFilter) -> int:
        return 3

    monkeypatch.setattr(svc.project_repository, "count", _count)

    assert await svc.count(_DB(), ProjectFilter()) == 3


# ── get_by_id ────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_by_id_missing_project_raises_404(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _none(_db: object, _pid: int) -> None:
        return None

    monkeypatch.setattr(svc.project_repository, "get_detail", _none)

    with pytest.raises(HTTPException) as exc_info:
        await svc.get_by_id(_DB(), 5)

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_get_by_id_derives_public_score_and_projects_skills(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _detail(_db: object, _pid: int) -> ProjectRow:
        return ProjectRow(project=_out(7), status="active")

    async def _scored(_db: object, _pid: int) -> list[tuple[SkillRef, float, float, str]]:
        return [(_skill(9, "Python", importance=4, level=3, level_public=4), 4.0, 4.0, "active")]

    monkeypatch.setattr(svc.project_repository, "get_detail", _detail)
    monkeypatch.setattr(svc.skill_repository, "get_scored_skills", _scored)

    out = await svc.get_by_id(_DB(), 7)

    assert out.id == 7
    assert out.public_score == 80.0  # effective 4 × level_public 4 / 4 × 20
    assert len(out.skills) == 1
    assert out.skills[0].name == "Python"
    assert out.skills[0].effective_importance == 4.0
    assert out.skills[0].level == 3
    assert out.skills[0].level_public == 4
    assert out.skills[0].status == "active"


# ── get_neighbors ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_neighbors_missing_project_raises_404(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _no(_db: object, _pid: int) -> bool:
        return False

    monkeypatch.setattr(svc.project_repository, "exists", _no)

    with pytest.raises(HTTPException) as exc_info:
        await svc.get_neighbors(_DB(), 5, ProjectFilter())

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_get_neighbors_returns_prev_and_next(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _yes(_db: object, _pid: int) -> bool:
        return True

    async def _neighbors(
        _db: object, _pid: int, _filters: ProjectFilter, *, sort_by: str, sort_order: str
    ) -> tuple[int | None, int | None]:
        return (4, 6)

    monkeypatch.setattr(svc.project_repository, "exists", _yes)
    monkeypatch.setattr(svc.project_repository, "get_neighbors", _neighbors)

    out = await svc.get_neighbors(_DB(), 5, ProjectFilter())

    assert (out.prev_id, out.next_id) == (4, 6)
