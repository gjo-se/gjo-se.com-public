"""Match-score computation for AIScope projects.

Extracted from the former monolithic ``project_service`` (god-file split). Holds
the pure weighted-coverage formula, the persisted score recalculation and the
level-override simulation used by the chart services.
"""

from decimal import ROUND_HALF_UP, Decimal
from types import SimpleNamespace
from typing import Any

import structlog

from app.fbf.repositories import (
    project_repository,
    skill_repository,
)
from app.fbf.repositories.skill_repository import SkillRef
from app.fbf.services.skill_service import effective_importance
from app.shared.db_access.session_types import AsyncSession

logger = structlog.get_logger(__name__)

_SCORE_QUANTUM = Decimal("1")


def _compute_match_score(
    scored_skills: list[tuple[SkillRef, float | None, float | None, str | None]],
    *,
    use_public_level: bool = False,
) -> Decimal | None:
    """Compute the weighted match score for a project's skills.

    Formula: Σ(effective_importance × level) / Σ(effective_importance) × 20

    Three independent importance sources (project, avg, curated) are blended
    with equal weight and NULL-fallback.  Skills without a curated level
    contribute with ``level = 0`` — they drag the score down instead of being
    ignored.

    The raw 0–5 result is multiplied by 20 to yield an intuitive **0–100
    percentage**.

    Args:
        scored_skills: ``(SkillRef, project_importance, avg_importance,
            status_name)`` tuples as returned by :func:`get_scored_skills`.
        use_public_level: When True, the externally shown ``level_public`` is
            used as the knowledge level instead of the internal ``level``.

    Returns:
        The rounded match score (0–100), or ``None`` when no skill
        provides a basis (all weights zero).
    """
    scored: list[tuple[SkillRef, float]] = []
    for skill, project_imp, avg_imp, _status_name in scored_skills:
        effective = effective_importance(skill, project_imp, avg_imp)
        if effective > 0:
            scored.append((skill, effective))

    weight_sum = sum(eff for _, eff in scored)
    if weight_sum == 0:
        return None

    weighted = sum(eff * ((skill.level_public if use_public_level else skill.level) or 0) for skill, eff in scored)
    base = Decimal(weighted) / Decimal(weight_sum) * 20
    return base.quantize(_SCORE_QUANTUM, rounding=ROUND_HALF_UP)


def public_score_from_skills(
    scored_skills: list[tuple[SkillRef, float | None, float | None, str | None]],
) -> Decimal | None:
    """Public-facing match score from already-loaded scored skills.

    Same basis as ``confirmed_score`` (only ``status='active'`` skills) but
    weighted by the externally shown ``level_public`` instead of the internal
    ``level``. Returns ``None`` when no active skill provides a basis.
    """
    return _compute_match_score(
        [s for s in scored_skills if s[3] == "active"],
        use_public_level=True,
    )


async def compute_public_score(db: AsyncSession, project_id: int) -> float | None:
    """Public match score (0–100) for a project, or ``None`` when not computable.

    Convenience wrapper for callers that have not already loaded the project's
    scored skills (e.g. the application mail builder).
    """
    scored_skills = await skill_repository.get_scored_skills(
        db,
        project_id,
        status="active",
    )
    score = _compute_match_score(scored_skills, use_public_level=True)
    return float(score) if score is not None else None


async def recalculate_match_score(
    db: AsyncSession,
    project_id: int,
) -> dict[str, object]:
    """Recompute and persist both match scores for a project.

    Loads the project's linked canonical skills, computes the weighted
    coverage score using :func:`_compute_match_score` and stores results in
    ``project.match_score`` (all non-blacklisted skills) and
    ``project.confirmed_score`` (only ``status='active'`` skills).

    Additionally derives a non-persisted ``public_score``: same basis as
    ``confirmed_score`` (only ``status='active'`` skills) but computed with the
    externally shown ``level_public`` instead of the internal ``level``.

    Intended to be called after a skill linkage change
    (e.g. from the extraction service).

    Args:
        db: gjo_se_com database session.
        project_id: Master project primary key.

    Returns:
        Dict with ``project_id``, ``match_score`` (float or None),
        ``confirmed_score`` (float or None), and ``public_score`` (float or
        None, derived – not persisted). All values are None when the project
        does not exist.
    """
    project = await project_repository.get_out_by_id(db, project_id)
    if project is None:
        return {
            "project_id": project_id,
            "match_score": None,
            "confirmed_score": None,
            "public_score": None,
        }

    all_skills = await skill_repository.get_scored_skills(db, project_id)
    confirmed_skills = await skill_repository.get_scored_skills(
        db,
        project_id,
        status="active",
    )

    score = _compute_match_score(all_skills)
    confirmed = _compute_match_score(confirmed_skills)
    public = _compute_match_score(confirmed_skills, use_public_level=True)

    await project_repository.set_scores(
        db,
        project_id,
        match_score=score,
        confirmed_score=confirmed,
    )
    await db.commit()
    logger.info(
        "Match-Score recalculated: project_id=%s score=%s confirmed=%s public=%s",
        project_id,
        score,
        confirmed,
        public,
    )
    return {
        "project_id": project_id,
        "match_score": float(score) if score is not None else None,
        "confirmed_score": float(confirmed) if confirmed is not None else None,
        "public_score": float(public) if public is not None else None,
    }


async def recalculate_all_scores(db: AsyncSession) -> dict[str, Any]:
    """Recompute and persist match scores for ALL projects.

    Loads every project with linked skills, recomputes the score via
    :func:`_compute_match_score`, and persists the result.

    Args:
        db: gjo_se_com database session.

    Returns:
        Dict with ``updated`` count.
    """
    projects = await project_repository.get_all_ids(db)
    updated = 0
    for project_id in projects:
        try:
            result = await recalculate_match_score(db, project_id)
            if result["match_score"] is not None:
                updated += 1
        except Exception:
            logger.exception("Score recalculation failed for project_id=%d", project_id)
    logger.info("Bulk score recalculation complete: %d/%d updated.", updated, len(projects))
    return {"updated": updated, "total": len(projects)}


def simulate_score(
    scored_skills: list[tuple[SkillRef, float | None, float | None, str | None]],
    skill_id_override: int,
    new_level: int,
) -> Decimal | None:
    """Compute a match score with one skill's ``level`` temporarily overridden.

    Creates a lightweight copy of each skill (``SimpleNamespace``) so the
    original ORM objects are never mutated.  All other skills retain their
    actual ``level``.

    Args:
        scored_skills: Tuples as returned by :func:`get_scored_skills`.
        skill_id_override: ID of the skill whose ``level`` to override.
        new_level: Simulated knowledge level (0–5).

    Returns:
        The simulated match score (0–100), or ``None``.
    """
    modified: list[tuple[SkillRef, float | None, float | None, str | None]] = []
    for skill, proj_imp, avg_imp, status_name in scored_skills:
        if skill.id == skill_id_override:
            ns: Any = SimpleNamespace(
                id=skill.id,
                level=new_level,
                importance=skill.importance,
            )
            modified.append((ns, proj_imp, avg_imp, status_name))
        else:
            modified.append((skill, proj_imp, avg_imp, status_name))
    return _compute_match_score(modified)
