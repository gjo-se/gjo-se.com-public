"""Application CV context assembly from backend data (gjo_se_com).

Builds the Jinja2 context for the application CV exclusively from backend data
(profile, project, skills, experiences). The pure per-block mappings live in
:mod:`cv_profile_service` and :mod:`cv_experience_service`; this module wires
them into the final template dict. No LLM is involved – the content is
reproducible and free of hallucination.
"""

from __future__ import annotations

import base64
from dataclasses import dataclass
from pathlib import Path

import structlog

from app.application.domain import application_cv_skills_rules, cv_radar_rules
from app.application.infrastructure import application_mail_client
from app.application.repositories import experience_repository, profile_repository
from app.application.schemas.profile_schemas import ProfileOut
from app.application.services import cv_experience_service, cv_profile_service, start_service
from app.shared.db_access.session_types import AsyncSession
from app.shared.ports.project import ProjectCatalogPort
from app.shared.ports.skill import SkillBlend, SkillCatalogPort
from app.shared.storage.infrastructure.factory_client import get_object_store

logger = structlog.get_logger(__name__)

#: Skill tag used by the project-less CV (the "site:promo" promoted skills).
_PROMO_TAG = "site:promo"

#: Top skills rendered per curated group in the project-less CV. Mirrors the
#: public ``/skills`` page ("all groups, first 7 skills each").
_SITE_SKILL_GROUP_TOP_N = 7

# MIME type per storage-key extension for the embedded header photo.
_PHOTO_MIME_BY_SUFFIX: dict[str, str] = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
}


async def _build_photo_data_uri(photo_url: str | None) -> str | None:
    """Loads the profile photo from the object store as a ``data:`` URI.

    WeasyPrint renders ``HTML(string=…)`` from an in-memory string; external
    storage URLs are therefore not resolvable, so the photo bytes are inlined
    as Base64. Any load failure degrades gracefully to a text-only header.

    Args:
        photo_url: Storage key of the profile photo (e.g. ``profile/photo.jpg``).

    Returns:
        A ``data:<mime>;base64,<…>`` string, or ``None`` when no key is set or
        the object cannot be read.
    """
    if not photo_url:
        return None
    try:
        data = await get_object_store().get(photo_url)
    except Exception:
        logger.exception("application_cv: photo load failed", photo_key=photo_url)
        return None
    mime = _PHOTO_MIME_BY_SUFFIX.get(Path(photo_url).suffix.lower(), "application/octet-stream")
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def _blend_skills(
    rows: list[SkillBlend] | None,
) -> list[tuple[str, float, int | None]]:
    """Maps blended skill rows to ``(name, importance, level_public)`` tuples.

    The ``importance`` is the single blended ``effective_importance`` (identical
    to the public Proof path), computed by the skill-catalog port; sorted DESC;
    ``None`` or an empty result yields an empty list.
    """
    if not rows:
        return []
    blended = [(row.name, row.importance, row.level_public) for row in rows]
    blended.sort(key=lambda item: item[1], reverse=True)
    return blended


def _build_skills(
    blended: list[tuple[str, float, int | None]],
) -> list[dict[str, str]]:
    """Text skill list (ATS) in ``effective_importance`` DESC order."""
    return [{"name": name} for name, _importance, _level in blended]


def _build_skills_radar(
    blended: list[tuple[str, float, int | None]],
) -> list[dict[str, object]]:
    """Top ``cv_radar_rules.MAX_AXES`` skills for the radar (``importance`` DESC)."""
    return [
        {"name": name, "importance": importance, "level_public": level}
        for name, importance, level in blended[: cv_radar_rules.MAX_AXES]
    ]


def _build_languages(profile: ProfileOut) -> list[str]:
    """Splits the comma-separated ``languages`` string into a trimmed list."""
    if not profile.languages:
        return []
    return [lang.strip() for lang in profile.languages.split(",") if lang.strip()]


async def _load_skill_groups(db: AsyncSession, project_id: int, *, skills: SkillCatalogPort) -> list[dict[str, object]]:
    """Loads the grouped CV skill list for a project.

    Auto skills come from the ``project_skill`` junction only – no curated
    merging (see :func:`application_cv_skills_rules.build_cv_skill_groups`). The list
    is not capped; per master all linked variants are kept, except fragments and
    pure spelling duplicates of the same master.
    """
    links = await skills.get_cv_skill_links(db, project_id)
    return application_cv_skills_rules.build_cv_skill_groups(links)


async def _load_site_skill_groups(db: AsyncSession, *, skills: SkillCatalogPort) -> list[dict[str, object]]:
    """Builds the grouped CV skill list for the project-less CV.

    Mirrors the public ``/skills`` page: every curated group (``sort`` ASC)
    with its first ``_SITE_SKILL_GROUP_TOP_N`` skills in curated order
    (``sort`` ASC nulls last, then blended ``effective_importance`` DESC, then
    name ASC). Groups without any public skill are skipped.
    """
    groups = await skills.list_public_groups(db, cv_experience_service.FALLBACK_LOCALE)
    rows = await skills.list_public_skills(db, grouped_only=True)

    by_group: dict[int, list[SkillBlend]] = {}
    for skill in rows:
        if skill.group_id is None:
            continue
        by_group.setdefault(skill.group_id, []).append(skill)

    result: list[dict[str, object]] = []
    for group in groups:
        group_skills = by_group.get(group.id)
        if not group_skills:
            continue
        group_skills.sort(
            key=lambda item: (
                item.sort is None,
                item.sort if item.sort is not None else 0,
                -item.importance,
                item.name,
            )
        )
        result.append(
            {
                "label": group.label,
                "skills": [skill.name for skill in group_skills[:_SITE_SKILL_GROUP_TOP_N]],
            }
        )
    return result


@dataclass(frozen=True)
class _ProjectCvInputs:
    """Project-derived CV inputs (header, rate, start and skill selection)."""

    title: str | None
    title_normalized: str | None
    reference: str | None
    rate: int | None
    posting_text: str | None
    field_percent: int | None
    start: str | None
    start_manual: str | None
    country: str | None
    skill_rows: list[SkillBlend] | None
    skill_groups: list[dict[str, object]]


async def _load_project_cv_inputs(
    db: AsyncSession,
    project_id: int,
    *,
    use_default_skills: bool,
    catalog: ProjectCatalogPort,
    skills: SkillCatalogPort,
) -> _ProjectCvInputs:
    """Loads the project metadata and the grouped skill selection for the CV.

    ``use_default_skills`` swaps the project-linked skill groups for the
    curated default groups (:func:`_load_site_skill_groups`); the project header
    and the project-scoped radar rows stay untouched.

    Raises:
        ValueError: If the project does not exist.
    """
    project = await catalog.get_project(db, project_id)
    if project is None:
        logger.warning("application_cv: project %s not found", project_id)
        raise ValueError(f"Project {project_id} not found")
    reference = await catalog.get_freelancermap_external_id(db, project.url)
    skill_rows = await skills.get_project_public_skills(db, project_id)
    skill_groups = (
        await _load_site_skill_groups(db, skills=skills)
        if use_default_skills
        else await _load_skill_groups(db, project_id, skills=skills)
    )
    return _ProjectCvInputs(
        title=project.title,
        title_normalized=application_mail_client.resolve_title_normalized(project),
        reference=reference,
        rate=project.my_hourly_rate,
        posting_text=project.description,
        field_percent=project.remote_percent,
        start=project.start_date,
        start_manual=project.my_start_date,
        country=project.country,
        skill_rows=skill_rows,
        skill_groups=skill_groups,
    )


async def build_application_cv_context(
    db: AsyncSession,
    *,
    catalog: ProjectCatalogPort,
    skills: SkillCatalogPort,
    project_id: int | None = None,
    use_default_skills: bool = False,
) -> dict[str, object]:
    """Builds the Jinja2 context for the application CV from backend data.

    Args:
        db: Active gjo_se_com DB session.
        catalog: Project-catalog port (fbf-owned project facts).
        skills: Skill-catalog port (fbf-owned skill data).
        project_id: Target project id. ``None`` renders the project-less CV:
            skills tagged ``site:promo`` are used and no project link is emitted.
        use_default_skills: When ``True`` (and a project is given) the grouped
            skill section uses the curated default groups
            (:func:`_load_site_skill_groups`) instead of the project's linked
            skills – for projects whose posting demands too few skills. The
            project header (title/reference) and radar stay project-specific.

    Returns:
        Context dict consumed by the ``cv`` PDF template.

    Raises:
        ValueError: If the project (when given) or the application profile does
            not exist.
    """
    try:
        if project_id is not None:
            inputs = await _load_project_cv_inputs(
                db, project_id, use_default_skills=use_default_skills, catalog=catalog, skills=skills
            )
        else:
            # Project-less CV mirrors the public /skills page: the promo skills
            # feed the radar and all curated groups (first 7 each) form the
            # grouped section.
            promo_rows = await skills.list_public_skills(db, tag=_PROMO_TAG)
            inputs = _ProjectCvInputs(
                title=None,
                title_normalized=None,
                reference=None,
                rate=None,
                posting_text=None,
                field_percent=None,
                start=None,
                start_manual=None,
                country=None,
                skill_rows=promo_rows,
                skill_groups=await _load_site_skill_groups(db, skills=skills),
            )

        profile = await profile_repository.get_profile(db)
        if profile is None:
            logger.warning("application_cv: application profile not found")
            raise ValueError("Application profile not found")

        blended_skills = _blend_skills(inputs.skill_rows)
        skills_radar = _build_skills_radar(blended_skills)
        photo_data_uri = await _build_photo_data_uri(profile.photo_url)

        experience_rows = await experience_repository.get_by_profile(db, profile.id, active_only=True)
        experiences = cv_experience_service.build_experiences(experience_rows)

        profile_context = cv_profile_service.build_profile_context(
            profile,
            project_rate=inputs.rate,
            posting_text=inputs.posting_text,
            field_percent=inputs.field_percent,
            required_start=start_service.resolve_required_start(
                text=inputs.posting_text,
                field_value=inputs.start,
                manual=inputs.start_manual,
            ),
            on_request=project_id is None,
            country=inputs.country,
        )

        return {
            "profile": profile_context,
            "story": cv_experience_service.build_story(profile),
            "photo_data_uri": photo_data_uri,
            "skills": _build_skills(blended_skills),
            "skill_groups": inputs.skill_groups,
            "skills_radar": skills_radar,
            "radar_svg": cv_radar_rules.build_radar_svg(skills_radar),
            "languages": _build_languages(profile),
            "experiences": experiences,
            "project": (
                {
                    "title": inputs.title,
                    "title_normalized": inputs.title_normalized,
                    "reference": inputs.reference,
                }
                if project_id is not None
                else None
            ),
            "project_id": project_id,
            "use_default_skills": use_default_skills,
        }
    except ValueError:
        raise
    except Exception:
        logger.exception("application_cv: context build failed (project_id=%s)", project_id)
        raise
