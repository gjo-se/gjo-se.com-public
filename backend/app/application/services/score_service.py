"""Application score run orchestration (Act 1–4) and ``application-score`` LLM task.

Provides the Pydantic output schema for the ``application-score`` LLM task
(extracted requirements + per-criterion evaluations) and
:func:`run_content_scoring`, which executes the LLM call through the central
task pipeline and normalises the response into canon-ordered
:class:`CriterionScore` rows plus the extracted requirements. Content scoring
runs ``_LLM_SAMPLE_COUNT`` independent samples (deterministic temperature, one
core session each) and merges them per criterion via the median.

On top of that, :func:`run_application_score` orchestrates a complete score run
(Act 1–4) in one gjo_se_com transaction. The read/serialize path lives in
:mod:`app.application.services.score_serialization_service` and the package
prompt preparation in :mod:`app.application.services.score_paket_service`.

The service never resolves the model or prompt itself – it delegates to
:data:`get_task_executor_service` so all LLM infrastructure (mapping, prompt,
call logging, circuit breaker) stays centralised. Each content sample opens its
own core database session because the LLM client releases the session once the
call parameters are resolved.
"""

from __future__ import annotations

import asyncio
import statistics
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

import structlog
from pydantic import BaseModel, Field

from app.application.domain import application_score_hard_facts_rules
from app.application.domain.application_score_rubric_rules import (
    CONTENT_CRITERIA_KEYS,
    CRITERIA_BY_KEY,
    WEIGHTS_VERSION,
    CriterionScore,
    aggregate,
    missing_criterion,
)
from app.application.exceptions import ApplicationScoreError, ApplicationScoreLLMError
from app.application.repositories import (
    profile_repository,
    score_criterion_repository,
    score_run_repository,
    submission_repository,
)
from app.application.schemas.score_schemas import RequirementOut, ScoreRunOut
from app.application.services import cv_service
from app.application.services.score_paket_service import _flatten_paket
from app.application.services.score_serialization_service import serialize_score_run
from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_task_executor_service
from app.shared.llm_gateway.domain.task_registry_rules import ApplicationScoreTrigger
from app.shared.ports.project import (
    ProjectCatalogPort,
    ProjectRef,
    get_project_catalog_port,
)
from app.shared.ports.skill import SkillCatalogPort, get_skill_catalog_port

logger = structlog.get_logger(__name__)

__all__ = ["serialize_score_run"]

_MAX_REQUIREMENTS = 20
"""Maximum number of requirements kept from the LLM response."""

_MAX_REQUIREMENT_TEXT_LENGTH = 300
"""Maximum characters per requirement text (truncated beyond this)."""

_LLM_SAMPLE_COUNT = 3
"""Independent LLM samples per score run (self-consistency)."""

_LLM_TEMPERATURE = 0.0
"""Sampling temperature for the ``application-score`` task (deterministic)."""

_LLM_SEED_BASE = 42
"""Base seed; sample *i* uses ``_LLM_SEED_BASE + i``."""

#: Per-criterion scope hints appended to the rubric text in the prompt. Sends
#: ``must_skills`` exclusively against the merged skill area so soft-skill /
#: domain / seniority / proof / framework aspects (which have their own criteria)
#: never leak into the skill score.
_CRITERION_SCOPE_HINTS: dict[str, str] = {
    "must_skills": (
        " – bewerte AUSSCHLIESSLICH anhand des Skill-Bereichs `cv_context.skills`"
        " (harte Skills/Tools/Tech). Soft-Skills, Domäne, Seniorität, Proof und"
        " Rahmen (Nearshore/Start/Remote/Sprache/Einsatzform) zählen hier NICHT."
    ),
}


class CriterionEvaluation(BaseModel):
    """LLM assessment of a single content/form criterion."""

    key: str = Field(description="Kanon-Key des bewerteten Kriteriums (einer der übergebenen Content-/Form-Keys).")
    value: float = Field(description="Passung 0.0–1.0; wird im Service auf [0,1] geklemmt.")
    reason: str = Field(description="Kurze Begründung der Bewertung.")
    evidence: str | None = Field(default=None, description="Beleg aus dem Bewerbungspaket (Zitat/Stelle).")
    action: str | None = Field(default=None, description="Konkreter Verbesserungsvorschlag, wenn der Wert < 1 ist.")


class ApplicationScoreLLMResult(BaseModel):
    """Structured output envelope of the ``application-score`` LLM task."""

    requirements: list[RequirementOut] = Field(
        default_factory=list, description="Extrahierte Anforderungen der Ausschreibung."
    )
    criteria: list[CriterionEvaluation] = Field(
        default_factory=list, description="Bewertung je Content-/Form-Kriterium."
    )


@dataclass(frozen=True, slots=True)
class ContentScoringResult:
    """Normalised result of a content-scoring run.

    Attributes:
        criteria: Canon-ordered criterion scores (content + form groups).
        requirements: Extracted and normalised posting requirements.
        llm_call_log_id: Persisted LLM call-log row id, or ``None``.
    """

    criteria: list[CriterionScore]
    requirements: list[RequirementOut]
    llm_call_log_id: int | None


async def _run_content_sample(
    *,
    ausschreibung: str,
    paket: str,
    kriterien_text: str,
    project_id: int,
    sample_index: int,
) -> dict[str, Any]:
    """Execute one ``application-score`` sample on its own core session.

    Each sample uses the deterministic temperature with a distinct seed so the
    self-consistency median can absorb residual provider non-determinism.

    Args:
        ausschreibung: Resolved job posting text.
        paket: Flattened application package.
        kriterien_text: Pre-rendered content/form criterion list for the prompt.
        project_id: Originating project id (call-log context).
        sample_index: Zero-based sample index (selects the seed).

    Returns:
        The raw ``execute_task`` result dict for this sample.
    """
    async with score_run_repository.open_sample_session() as sample_db:
        return await get_task_executor_service().execute_task(
            db=sample_db,
            task_key="application-score",
            variables={
                "ausschreibung": ausschreibung,
                "paket": paket,
                "kriterien": kriterien_text,
            },
            project_id=project_id,
            trigger=ApplicationScoreTrigger.BUTTON,
            hyperparameters={
                "temperature": _LLM_TEMPERATURE,
                "seed": _LLM_SEED_BASE + sample_index,
            },
        )


async def run_content_scoring(
    *,
    ausschreibung: str,
    paket: str,
    run_id: int,
    project_id: int,
) -> ContentScoringResult:
    """Run the ``application-score`` LLM task and normalise its output.

    Runs :data:`_LLM_SAMPLE_COUNT` independent samples in parallel (each on its
    own core session, since the LLM client releases the session after
    preparation) and merges them per criterion via the median value.

    Args:
        ausschreibung: Resolved job posting text.
        paket: Flattened application package (mail + CV context).
        run_id: Score run id (log/trace context only).
        project_id: Originating project id (call-log context).

    Returns:
        The normalised :class:`ContentScoringResult`.

    Raises:
        ApplicationScoreLLMError: If every sample failed.
    """
    kriterien_text = "\n".join(
        f"- {key}: {CRITERIA_BY_KEY[key].label}{_CRITERION_SCOPE_HINTS.get(key, '')}" for key in CONTENT_CRITERIA_KEYS
    )

    raw_results = await asyncio.gather(
        *(
            _run_content_sample(
                ausschreibung=ausschreibung,
                paket=paket,
                kriterien_text=kriterien_text,
                project_id=project_id,
                sample_index=index,
            )
            for index in range(_LLM_SAMPLE_COUNT)
        ),
        return_exceptions=True,
    )

    successes: list[dict[str, Any]] = []
    error_type: str | None = None
    for result in raw_results:
        if isinstance(result, BaseException):
            logger.warning(
                "score_content_sample_failed",
                run_id=run_id,
                project_id=project_id,
                error=str(result),
            )
            continue
        if not result["success"]:
            error_type = result.get("error_type") or error_type
            continue
        successes.append(result)

    if not successes:
        logger.warning(
            "score_content_llm_failed",
            run_id=run_id,
            project_id=project_id,
            error_type=error_type,
        )
        raise ApplicationScoreLLMError(error_type or "unknown")

    llm_results: list[ApplicationScoreLLMResult] = [r["result"] for r in successes]
    return ContentScoringResult(
        criteria=_map_criteria(_merge_criterion_samples(llm_results)),
        requirements=_normalize_requirements(llm_results[0].requirements),
        llm_call_log_id=successes[0]["call_log_id"],
    )


def _merge_criterion_samples(
    results: list[ApplicationScoreLLMResult],
) -> list[CriterionEvaluation]:
    """Merge per-criterion evaluations across samples via the median value.

    For every criterion key the median of the sampled values is used; the
    representative evaluation (``reason``/``evidence``/``action``) is the sample
    whose value lies closest to that median.

    Args:
        results: Successful sample results (at least one).

    Returns:
        One merged :class:`CriterionEvaluation` per key seen in any sample.
    """
    by_key: dict[str, list[CriterionEvaluation]] = {}
    for result in results:
        for evaluation in result.criteria:
            by_key.setdefault(evaluation.key, []).append(evaluation)

    merged: list[CriterionEvaluation] = []
    for evaluations in by_key.values():
        median_value = statistics.median(item.value for item in evaluations)
        representative = min(evaluations, key=lambda item: abs(item.value - median_value))
        merged.append(
            CriterionEvaluation(
                key=representative.key,
                value=median_value,
                reason=representative.reason,
                evidence=representative.evidence,
                action=representative.action,
            )
        )
    return merged


def _map_criteria(evaluations: list[CriterionEvaluation]) -> list[CriterionScore]:
    """Normalise LLM criterion evaluations against the canon.

    Unknown keys are dropped (logged) and never persisted; missing canon keys
    become data-gap entries (``value=None``) via :func:`missing_criterion`.
    Known values are clamped to ``[0, 1]`` and enriched with canon
    ``group``/``weight``.

    Args:
        evaluations: Raw criterion evaluations from the LLM.

    Returns:
        Exactly the content/form criteria in canon order.
    """
    known: dict[str, CriterionEvaluation] = {}
    for evaluation in evaluations:
        if evaluation.key not in CRITERIA_BY_KEY:
            logger.warning("score_content_unknown_criterion", criterion_key=evaluation.key)
            continue
        known[evaluation.key] = evaluation

    mapped: list[CriterionScore] = []
    for key in CONTENT_CRITERIA_KEYS:
        evaluation = known.get(key)
        if evaluation is None:
            mapped.append(missing_criterion(key))
            continue
        canon = CRITERIA_BY_KEY[key]
        value = min(1.0, max(0.0, evaluation.value))
        mapped.append(
            CriterionScore(
                key=key,
                group=canon.group,
                value=value,
                weight=canon.weight,
                reason=evaluation.reason,
                evidence=evaluation.evidence,
                action=evaluation.action,
            )
        )
    return mapped


def _normalize_requirements(requirements: list[RequirementOut]) -> list[RequirementOut]:
    """Cap the requirement count and truncate over-long requirement texts.

    Args:
        requirements: Raw requirements from the LLM.

    Returns:
        At most ``_MAX_REQUIREMENTS`` entries with truncated ``text`` and
        ``cv_evidence``.
    """
    normalized: list[RequirementOut] = [
        RequirementOut(
            text=requirement.text[:_MAX_REQUIREMENT_TEXT_LENGTH],
            kind=requirement.kind,
            covered=requirement.covered,
            cv_evidence=(requirement.cv_evidence[:_MAX_REQUIREMENT_TEXT_LENGTH] if requirement.cv_evidence else None),
        )
        for requirement in requirements[:_MAX_REQUIREMENTS]
    ]
    return normalized


def _resolve_ausschreibung_text(project: ProjectRef, description_override: str | None) -> str:
    """Resolves the posting text used by both hard facts and the LLM.

    Args:
        project: Project ORM object.
        description_override: Optional override provided by the caller.

    Returns:
        The override if set, otherwise the project ``description``, stripped.

    Raises:
        ApplicationScoreError: If neither source yields a non-empty text (422).
    """
    text = (description_override or project.description or "").strip()
    if not text:
        raise ApplicationScoreError(
            "Projekt hat keine description und kein Override wurde übergeben",
            status_code=422,
        )
    return text


async def run_application_score(
    gjo_db: AsyncSession,
    *,
    catalog: ProjectCatalogPort | None = None,
    skills: SkillCatalogPort | None = None,
    project_id: int | None = None,
    submission_id: int | None = None,
    description_override: str | None = None,
) -> ScoreRunOut:
    """Runs a complete application score run (Act 1–4) in one gjo_se_com transaction.

    Resolves submission/project/profile, computes the deterministic hard facts,
    runs the LLM content scoring (self-consistency, own core sessions) and
    aggregates the total and persists the finalized run plus its 11 criterion
    rows.

    Args:
        gjo_db: gjo_se_com session (project/submission/profile/run/criteria).
        catalog: Project-catalog port (fbf-owned project facts).
        skills: Skill-catalog port (fbf-owned skill data).
        project_id: Project id (alternative to ``submission_id``).
        submission_id: Submission id (alternative to ``project_id``).
        description_override: Optional posting text override.

    Returns:
        The persisted, completed :class:`ScoreRun`.

    Raises:
        ApplicationScoreError: On missing submission/project/profile (404/422)
            or a failed LLM call (502).
    """
    if catalog is None:
        catalog = await get_project_catalog_port()
    if skills is None:
        skills = await get_skill_catalog_port()
    if submission_id is not None:
        submission = await submission_repository.get_by_id(gjo_db, submission_id)
    else:
        if project_id is None:
            raise ApplicationScoreError("Projekt-ID oder Vorgangs-ID erforderlich", status_code=422)
        submission = await submission_repository.get_by_project(gjo_db, project_id)
    if submission is None:
        raise ApplicationScoreError("Vorgang nicht gefunden", status_code=404)

    project = await catalog.get_project(gjo_db, submission.project_id)
    if project is None:
        raise ApplicationScoreError("Projekt nicht gefunden", status_code=404)

    profile = await profile_repository.get_profile(gjo_db)
    if profile is None:
        raise ApplicationScoreError("Application Profile fehlt", status_code=422)

    ausschreibung_text = _resolve_ausschreibung_text(project, description_override)

    run = await score_run_repository.create_run(
        gjo_db,
        application_submission_id=submission.id,
        project_id=project.id,
        weights_version=WEIGHTS_VERSION,
    )

    hard_scores = application_score_hard_facts_rules.compute_hard_facts(
        project=project,
        profile=profile,
        submission=submission,
        ausschreibung_text=ausschreibung_text,
    )

    cv_context = await cv_service.build_application_cv_context(
        gjo_db, catalog=catalog, skills=skills, project_id=project.id
    )
    paket = _flatten_paket(submission, cv_context)

    try:
        content = await run_content_scoring(
            ausschreibung=ausschreibung_text,
            paket=paket,
            run_id=run.id,
            project_id=project.id,
        )
    except ApplicationScoreLLMError as exc:
        raise ApplicationScoreError(str(exc), status_code=502) from exc

    all_scores = hard_scores + content.criteria
    total, verdict, _missing_keys, _assessed_weight = aggregate(all_scores)

    _ = await score_criterion_repository.create_rows(gjo_db, run.id, all_scores)

    run = await score_run_repository.finalize(
        gjo_db,
        run.id,
        requirements=[requirement.model_dump() for requirement in content.requirements],
        total_score=Decimal(str(total)),
        verdict=verdict,
        llm_call_log_id=content.llm_call_log_id,
        completed_at=datetime.now(UTC),
    )

    await gjo_db.commit()

    # Re-fetch with the criteria relationship eager-loaded so the router can
    # serialize the run without a lazy load in the sync serialization context.
    return await score_run_repository.get_by_id(gjo_db, run.id) or run
