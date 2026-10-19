"""Unit tests for the data-driven CV context assembly.

``build_application_cv_context`` wires profile, project, skills and experiences
into the Jinja2 context. The DB-coupled reads (profile/experience repositories,
project/skill ports, object store) are replaced by deterministic doubles at the
system boundary, so the orchestration contract is asserted without a database.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import pytest

from app.application.schemas.profile_schemas import ProfileLocaleFieldsOut, ProfileOut
from app.application.services import cv_context_service
from app.shared.ports.project import ProjectRef
from app.shared.ports.skill import CvSkillLink, SkillBlend, SkillGroupRef

pytestmark = pytest.mark.unit

_NOW = datetime(2026, 1, 1, tzinfo=UTC)

#: Object-store bytes for ``b"abc"`` inlined as a Base64 ``data:`` URI.
_PHOTO_URI = "data:image/png;base64,YWJj"


class _FakeProjectCatalog:
    """Project-catalog port double returning a fixed project/external id."""

    def __init__(self, project: ProjectRef | None, external_id: str | None = None) -> None:
        """Store the project facts returned by every read."""
        self._project = project
        self._external_id = external_id

    async def get_project(self, db: object, project_id: int) -> ProjectRef | None:
        """Return the configured project (or ``None``)."""
        return self._project

    async def get_freelancermap_external_id(self, db: object, url: str) -> str | None:
        """Return the configured external freelancermap id."""
        return self._external_id


class _FakeSkillCatalog:
    """Skill-catalog port double answering the CV-context reads."""

    def __init__(
        self,
        *,
        promo: list[SkillBlend] | None = None,
        groups: list[SkillGroupRef] | None = None,
        grouped: list[SkillBlend] | None = None,
        links: list[CvSkillLink] | None = None,
        project_skills: list[SkillBlend] | None = None,
    ) -> None:
        """Store the configured read answers."""
        self._promo = promo or []
        self._groups = groups or []
        self._grouped = grouped or []
        self._links = links or []
        self._project_skills = project_skills

    async def list_public_skills(
        self,
        db: object,
        *,
        group_id: int | None = None,
        limit: int | None = None,
        tag: str = "site:public",
        grouped_only: bool = False,
    ) -> list[SkillBlend]:
        """Return the grouped rows for the site groups, else the promo rows."""
        return self._grouped if grouped_only else self._promo

    async def list_public_groups(self, db: object, locale: str) -> list[SkillGroupRef]:
        """Return the curated public groups."""
        return self._groups

    async def get_cv_skill_links(self, db: object, project_id: int) -> list[CvSkillLink]:
        """Return the project's raw CV skill links."""
        return self._links

    async def get_project_public_skills(self, db: object, project_id: int) -> list[SkillBlend] | None:
        """Return the project's blended public skills."""
        return self._project_skills


class _FakeProfileRepository:
    """Profile-repository double for the singleton read."""

    def __init__(self, profile: ProfileOut | None) -> None:
        """Store the profile returned by ``get_profile``."""
        self._profile = profile

    async def get_profile(self, db: object) -> ProfileOut | None:
        """Return the configured singleton profile (or ``None``)."""
        return self._profile


class _FakeExperienceRepository:
    """Experience-repository double returning a fixed row list."""

    def __init__(self, rows: list[Any] | None = None) -> None:
        """Store the experience rows returned by ``get_by_profile``."""
        self._rows = rows or []

    async def get_by_profile(self, db: object, profile_id: int, active_only: bool = False) -> list[Any]:
        """Return the configured experience rows."""
        return self._rows


class _FakeObjectStore:
    """Object-store double returning fixed bytes or raising a load error."""

    def __init__(self, data: bytes = b"", *, fail: bool = False) -> None:
        """Store the bytes/behaviour the ``get`` call should produce."""
        self._data = data
        self._fail = fail

    async def get(self, key: str) -> bytes:
        """Return the configured bytes or raise a load error."""
        if self._fail:
            raise RuntimeError("store unavailable")
        return self._data


def _profile(*, languages: str | None = None, photo_url: str | None = None) -> ProfileOut:
    """Build the singleton profile DTO with a German story and optional facts."""
    return ProfileOut(
        id=1,
        full_name="Greg Erdmann",
        languages=languages,
        photo_url=photo_url,
        remote="Remote",
        translations={"de": ProfileLocaleFieldsOut(story="Geschichte")},
        created_at=_NOW,
        updated_at=_NOW,
    )


def _project() -> ProjectRef:
    """Build the project facts the CV header reads through the port."""
    return ProjectRef(
        id=7,
        title="Roh Titel",
        title_normalized="Data Architect",
        url="https://www.freelancermap.de/projekt/x",
        description="Start: 01.06.2026",
        remote_percent=100,
        contract_type=None,
        start_date=None,
        my_start_date=None,
        hourly_rate=None,
        my_hourly_rate=110,
        country="Deutschland",
        canonical_id=None,
    )


def _wire(
    monkeypatch: pytest.MonkeyPatch,
    *,
    profile: ProfileOut | None,
    store: _FakeObjectStore | None = None,
) -> None:
    """Patch the DB-coupled boundaries with deterministic doubles."""
    monkeypatch.setattr(cv_context_service, "profile_repository", _FakeProfileRepository(profile))
    monkeypatch.setattr(cv_context_service, "experience_repository", _FakeExperienceRepository())
    monkeypatch.setattr(cv_context_service, "get_object_store", lambda: store or _FakeObjectStore())


def _promo_skills() -> list[SkillBlend]:
    """Promo rows: one high- and one low-importance skill (sorted DESC by the builder)."""
    return [
        SkillBlend(skill_id=1, name="Python", level_public=4, group_id=10, sort=1, importance=0.9),
        SkillBlend(skill_id=2, name="Go", level_public=3, group_id=10, sort=2, importance=0.4),
    ]


async def test_build_application_cv_context_projectless_uses_promo_skills_and_on_request(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The project-less CV mirrors the public skills page and states facts on request."""
    _wire(monkeypatch, profile=_profile(languages="de, en"))
    skills = _FakeSkillCatalog(
        promo=_promo_skills(),
        groups=[SkillGroupRef(id=10, label="Languages"), SkillGroupRef(id=20, label="Cloud")],
        grouped=[
            SkillBlend(skill_id=1, name="Python", level_public=4, group_id=10, sort=1, importance=0.9),
            SkillBlend(skill_id=2, name="Go", level_public=3, group_id=10, sort=2, importance=0.4),
            SkillBlend(skill_id=3, name="AWS", level_public=4, group_id=20, sort=1, importance=0.8),
        ],
    )

    context = await cv_context_service.build_application_cv_context(
        object(), catalog=_FakeProjectCatalog(None), skills=skills, project_id=None
    )

    assert context["project"] is None
    assert context["project_id"] is None
    assert context["use_default_skills"] is False
    assert context["skills"] == [{"name": "Python"}, {"name": "Go"}]
    assert context["skill_groups"] == [
        {"label": "Languages", "skills": ["Python", "Go"]},
        {"label": "Cloud", "skills": ["AWS"]},
    ]
    assert context["skills_radar"] == [
        {"name": "Python", "importance": 0.9, "level_public": 4},
        {"name": "Go", "importance": 0.4, "level_public": 3},
    ]
    assert context["languages"] == ["de", "en"]
    assert context["story"] == "Geschichte"
    assert context["experiences"] == []
    assert context["photo_data_uri"] is None
    assert context["profile"]["available_from"] == "auf Anfrage"
    assert context["profile"]["hourly_rate"] == "auf Anfrage"


async def test_build_application_cv_context_with_project_maps_header_and_linked_groups(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A project CV carries the project header and the project-linked skill groups."""
    _wire(monkeypatch, profile=_profile())
    skills = _FakeSkillCatalog(
        links=[
            CvSkillLink(
                skill_id=1, original_name="Python", level_public=4, group_id=10, group_sort=1, group_label="Languages"
            ),
            CvSkillLink(
                skill_id=2, original_name="Go", level_public=3, group_id=10, group_sort=1, group_label="Languages"
            ),
        ],
        project_skills=_promo_skills(),
    )

    context = await cv_context_service.build_application_cv_context(
        object(), catalog=_FakeProjectCatalog(_project(), external_id="3049737"), skills=skills, project_id=7
    )

    assert context["project"] == {"title": "Roh Titel", "title_normalized": "Data Architect", "reference": "3049737"}
    assert context["project_id"] == 7
    assert context["use_default_skills"] is False
    assert context["skill_groups"] == [{"label": "Languages", "skills": ["Go", "Python"]}]
    assert context["skills"] == [{"name": "Python"}, {"name": "Go"}]
    assert context["profile"]["hourly_rate"] == "110 EUR / Stunde"


async def test_build_application_cv_context_default_skills_use_the_site_groups(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """``use_default_skills`` swaps the linked groups for the curated site groups."""
    _wire(monkeypatch, profile=_profile())
    skills = _FakeSkillCatalog(
        groups=[SkillGroupRef(id=20, label="Cloud")],
        grouped=[SkillBlend(skill_id=3, name="AWS", level_public=4, group_id=20, sort=1, importance=0.8)],
        project_skills=_promo_skills(),
    )

    context = await cv_context_service.build_application_cv_context(
        object(),
        catalog=_FakeProjectCatalog(_project(), external_id="3049737"),
        skills=skills,
        project_id=7,
        use_default_skills=True,
    )

    assert context["use_default_skills"] is True
    assert context["project"] == {"title": "Roh Titel", "title_normalized": "Data Architect", "reference": "3049737"}
    assert context["skill_groups"] == [{"label": "Cloud", "skills": ["AWS"]}]


async def test_build_application_cv_context_raises_for_an_unknown_project(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A project that the port cannot resolve raises a domain ``ValueError``."""
    _wire(monkeypatch, profile=_profile())
    skills = _FakeSkillCatalog()

    with pytest.raises(ValueError, match="Project 7 not found"):
        await cv_context_service.build_application_cv_context(
            object(), catalog=_FakeProjectCatalog(None), skills=skills, project_id=7
        )


async def test_build_application_cv_context_raises_without_an_application_profile(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A missing singleton profile raises a domain ``ValueError``."""
    _wire(monkeypatch, profile=None)
    skills = _FakeSkillCatalog(project_skills=_promo_skills())

    with pytest.raises(ValueError, match="Application profile not found"):
        await cv_context_service.build_application_cv_context(
            object(), catalog=_FakeProjectCatalog(_project(), external_id="3049737"), skills=skills, project_id=7
        )


async def test_build_application_cv_context_inlines_the_photo_as_a_data_uri(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A resolved profile photo is inlined as a Base64 ``data:`` URI."""
    _wire(monkeypatch, profile=_profile(photo_url="profile/photo.png"), store=_FakeObjectStore(b"abc"))
    skills = _FakeSkillCatalog(promo=_promo_skills())

    context = await cv_context_service.build_application_cv_context(
        object(), catalog=_FakeProjectCatalog(None), skills=skills, project_id=None
    )

    assert context["photo_data_uri"] == _PHOTO_URI


async def test_build_application_cv_context_uses_octet_stream_for_unknown_photo_suffix(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """An unknown photo extension falls back to ``application/octet-stream``."""
    _wire(monkeypatch, profile=_profile(photo_url="profile/photo.bin"), store=_FakeObjectStore(b"abc"))
    skills = _FakeSkillCatalog(promo=_promo_skills())

    context = await cv_context_service.build_application_cv_context(
        object(), catalog=_FakeProjectCatalog(None), skills=skills, project_id=None
    )

    assert context["photo_data_uri"] == "data:application/octet-stream;base64,YWJj"


async def test_build_application_cv_context_degrades_to_none_when_the_photo_load_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A failing photo load degrades gracefully to a text-only header."""
    _wire(monkeypatch, profile=_profile(photo_url="profile/photo.png"), store=_FakeObjectStore(fail=True))
    skills = _FakeSkillCatalog(promo=_promo_skills())

    context = await cv_context_service.build_application_cv_context(
        object(), catalog=_FakeProjectCatalog(None), skills=skills, project_id=None
    )

    assert context["photo_data_uri"] is None
