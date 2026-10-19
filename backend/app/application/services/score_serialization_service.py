"""Read/serialize path for a persisted application score run.

:func:`serialize_score_run` builds the API schema (criteria, per-group
aggregates, coverage and requirements) from a persisted run and reconciles the
persisted coverage snapshot against the *current* CV, so the detail view always
matches the CV without a costly re-score.
"""

from __future__ import annotations

from app.application.domain.application_score_rubric_rules import (
    GROUP_FORM,
    GROUP_INHALT,
    GROUP_RAHMEN,
    MIN_ASSESSED_WEIGHT_FOR_VERDICT,
    RUBRIC_TOTAL_WEIGHT,
    normalized_score,
)
from app.application.repositories import score_criterion_repository
from app.application.schemas.score_schemas import (
    RequirementOut,
    ScoreCriterionOut,
    ScoreGroupOut,
    ScoreRunOut,
)
from app.application.services import cv_service
from app.shared.db_access.session_types import AsyncSession
from app.shared.ports.skill import SkillCatalogPort


def _reconcile_requirements(requirements: list[RequirementOut], cv_skill_names: list[str]) -> None:
    """Re-derives ``covered``/``cv_evidence`` from the current CV skills.

    Deterministic, case-insensitive text match (no LLM). The current CV is the
    source of truth, so the persisted ``covered`` snapshot of the run is
    overwritten in place: a requirement is covered when a CV skill name occurs
    in its text (or the requirement text occurs in the skill name) – the matching
    skill name becomes ``cv_evidence``; otherwise ``covered`` is ``False`` and
    ``cv_evidence`` is ``None``.

    Args:
        requirements: RequirementOut schemas of the run (mutated in place).
        cv_skill_names: Current CV skill names (flat, from
            :func:`cv_service._load_skill_groups`).
    """
    normalized_skills = [(stripped.casefold(), stripped) for name in cv_skill_names if (stripped := name.strip())]
    for requirement in requirements:
        text = requirement.text.casefold()
        evidence: str | None = None
        for skill_casefold, skill_name in normalized_skills:
            if skill_casefold in text or text in skill_casefold:
                evidence = skill_name
                break
        requirement.covered = evidence is not None
        requirement.cv_evidence = evidence


def _group_aggregates(
    criteria: list[ScoreCriterionOut],
) -> list[ScoreGroupOut]:
    """Aggregates persisted criterion rows per group (derived, not persisted).

    Args:
        criteria: Persisted criterion rows of a run.

    Returns:
        One :class:`ScoreGroupOut` per group in fixed order.
    """
    groups: list[ScoreGroupOut] = []
    for group in (GROUP_INHALT, GROUP_FORM, GROUP_RAHMEN):
        rows = [row for row in criteria if row.group_key == group]
        weight = sum(row.weight for row in rows)
        assessed_weight = sum(row.weight for row in rows if row.value is not None)
        score = round(sum(float(row.value or 0) * row.weight for row in rows), 2)
        groups.append(
            ScoreGroupOut(
                group=group,
                score=score,
                weight=weight,
                assessed_weight=assessed_weight,
            )
        )
    return groups


async def serialize_score_run(gjo_db: AsyncSession, run: ScoreRunOut, skills: SkillCatalogPort) -> ScoreRunOut:
    """Serializes a persisted score run into the API schema.

    Args:
        gjo_db: Active gjo_se_com DB session.
        run: The persisted score run to serialize.
        skills: Skill-catalog port (fbf-owned skill data).

    Returns:
        The run schema with criteria, per-group aggregates and derived coverage.
    """
    criteria = await score_criterion_repository.list_by_run(gjo_db, run.id)

    out = ScoreRunOut.model_validate(run)

    # Reconcile the persisted coverage snapshot against the *current* CV so the
    # detail view always matches the CV without a costly re-score.
    cv_groups = await cv_service._load_skill_groups(gjo_db, run.project_id, skills=skills)
    cv_skill_names: list[str] = []
    for group in cv_groups:
        group_skills = group.get("skills")
        if isinstance(group_skills, list):
            cv_skill_names.extend(str(skill) for skill in group_skills)
    _reconcile_requirements(out.requirements, cv_skill_names)

    out.criteria = [ScoreCriterionOut.model_validate(c) for c in criteria]
    out.groups = _group_aggregates(criteria)
    out.assessed_weight = sum(c.weight for c in criteria if c.value is not None)
    out.missing_keys = [c.criterion_key for c in criteria if c.value is None]
    out.is_lower_bound = out.assessed_weight < RUBRIC_TOTAL_WEIGHT
    out.normalized_score = (
        normalized_score(float(run.total_score), out.assessed_weight) if run.total_score is not None else None
    )
    out.is_conclusive = out.assessed_weight >= MIN_ASSESSED_WEIGHT_FOR_VERDICT
    return out
