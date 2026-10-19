"""Unit tests for the skill-catalog port adapter."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from app.fbf.services import skill_catalog_adapter
from app.fbf.services.skill_catalog_adapter import SkillCatalogAdapter

pytestmark = pytest.mark.unit


def _skill() -> Any:
    """In-memory skill with the projected read fields."""
    return SimpleNamespace(id=1, name="Python", level_public=4, group_id=2, sort=3)


def _cv_row() -> Any:
    """In-memory repository row with the projected CV-link fields."""
    return SimpleNamespace(
        skill_id=7,
        original_name="Python",
        level_public=4,
        group_id=2,
        group_sort=1,
        group_label="Backend",
    )


@pytest.mark.asyncio
async def test_get_cv_skill_links_maps_repository_rows(monkeypatch: pytest.MonkeyPatch) -> None:
    """Repository rows are mapped to ``CvSkillLink`` values."""

    async def _rows(_db: Any, _project_id: int) -> list[Any]:
        return [_cv_row()]

    monkeypatch.setattr(skill_catalog_adapter.skill_repository, "get_cv_skill_rows", _rows)

    result = await SkillCatalogAdapter().get_cv_skill_links(None, 42)

    assert result[0].skill_id == 7
    assert result[0].original_name == "Python"
    assert result[0].group_label == "Backend"


@pytest.mark.asyncio
async def test_get_project_public_skills_blends_importance(monkeypatch: pytest.MonkeyPatch) -> None:
    """Rows are blended via ``skill_service.effective_importance`` into ``SkillBlend``."""

    async def _rows(_db: Any, _project_id: int) -> list[Any]:
        return [(_skill(), 0.5, 0.7)]

    monkeypatch.setattr(skill_catalog_adapter.skill_public_service, "get_project_public_skills", _rows)
    monkeypatch.setattr(skill_catalog_adapter.skill_service, "effective_importance", lambda *_args: 1.5)

    result = await SkillCatalogAdapter().get_project_public_skills(None, 42)

    assert result is not None
    assert result[0].name == "Python"
    assert result[0].importance == 1.5


@pytest.mark.asyncio
async def test_get_project_public_skills_none_for_unknown_project(monkeypatch: pytest.MonkeyPatch) -> None:
    """An unknown project propagates ``None`` instead of an empty list."""

    async def _rows(_db: Any, _project_id: int) -> None:
        return None

    monkeypatch.setattr(skill_catalog_adapter.skill_public_service, "get_project_public_skills", _rows)

    assert await SkillCatalogAdapter().get_project_public_skills(None, 999) is None


@pytest.mark.asyncio
async def test_list_public_skills_blends_importance(monkeypatch: pytest.MonkeyPatch) -> None:
    """Tagged public rows are blended into ``SkillBlend`` values."""

    async def _rows(_db: Any, **_kwargs: Any) -> list[Any]:
        return [(_skill(), 0.9)]

    monkeypatch.setattr(skill_catalog_adapter.skill_public_service, "list_public_skills", _rows)
    monkeypatch.setattr(skill_catalog_adapter.skill_service, "effective_importance", lambda *_args: 2.0)

    result = await SkillCatalogAdapter().list_public_skills(None)

    assert result[0].importance == 2.0
    assert result[0].skill_id == 1


@pytest.mark.asyncio
async def test_list_public_groups_maps_service_output(monkeypatch: pytest.MonkeyPatch) -> None:
    """The service group projection is mapped to ``SkillGroupRef`` values."""

    async def _groups(_db: Any, _locale: str) -> list[Any]:
        return [SimpleNamespace(id=1, label="Backend"), SimpleNamespace(id=2, label="Frontend")]

    monkeypatch.setattr(skill_catalog_adapter.skill_group_service, "list_public_groups", _groups)

    result = await SkillCatalogAdapter().list_public_groups(None, "de")

    assert [(group.id, group.label) for group in result] == [(1, "Backend"), (2, "Frontend")]


@pytest.mark.asyncio
async def test_add_project_skills_forwards_all_arguments(monkeypatch: pytest.MonkeyPatch) -> None:
    """The use-case arguments are forwarded unchanged to ``cv_skill_service``."""
    seen: dict[str, Any] = {}

    async def _add(
        db: Any,
        *,
        project_id: int,
        names: list[str],
        core_db: Any,
        embedding_client: Any,
    ) -> None:
        seen.update(db=db, project_id=project_id, names=names, core_db=core_db, embedding_client=embedding_client)

    monkeypatch.setattr(skill_catalog_adapter.cv_skill_service, "add_project_skills", _add)

    await SkillCatalogAdapter().add_project_skills(
        "gjo", project_id=5, names=["Python"], core_db="core", embedding_client="embed"
    )

    assert seen == {
        "db": "gjo",
        "project_id": 5,
        "names": ["Python"],
        "core_db": "core",
        "embedding_client": "embed",
    }


@pytest.mark.asyncio
async def test_exclude_project_skill_forwards_name(monkeypatch: pytest.MonkeyPatch) -> None:
    """The skill name is forwarded to ``cv_skill_service.exclude_project_skill``."""
    seen: dict[str, Any] = {}

    async def _exclude(_db: Any, *, name: str) -> None:
        seen["name"] = name

    monkeypatch.setattr(skill_catalog_adapter.cv_skill_service, "exclude_project_skill", _exclude)

    await SkillCatalogAdapter().exclude_project_skill(None, name="Python")

    assert seen["name"] == "Python"
