"""Database access for application experience projects (gjo_se_com).

Read operations return ``ExperienceOut`` DTOs (never ORM models) so the service
layer stays free of ``app.<ctx>.models`` imports (Achse 2: ``services`` >
``repositories``). Child levels (translations/decisions/proofs) are rebuilt here.
"""

from collections.abc import Mapping, Sequence
from datetime import date
from typing import Any

from sqlalchemy import Select, asc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.application.models.experience import Experience
from app.application.models.experience_decision import ExperienceDecision
from app.application.models.experience_proof import ExperienceProof
from app.application.repositories import experience_children_repository, experience_translation_repository
from app.application.schemas.experience_schemas import (
    DecisionIn,
    DecisionLocaleFieldsOut,
    DecisionOut,
    ExperienceLocaleFieldsOut,
    ExperienceOut,
    ProofIn,
    ProofLocaleFieldsOut,
    ProofOut,
)
from app.shared.db_access import repository_helpers
from app.shared.status.models.status import Status, Statusable

#: Statusable type discriminator for experience rows.
_STATABLE_TYPE = "application_experience"


def _to_out(experience: Experience, status_name: str | None, status_color: str | None) -> ExperienceOut:
    """Maps an experience ORM row (with loaded children) to its DTO."""
    return ExperienceOut(
        id=experience.id,
        application_profile_id=experience.application_profile_id,
        position=experience.position,
        company=experience.company,
        project_url=experience.project_url,
        start_date=experience.start_date,
        end_date=experience.end_date,
        sort=experience.sort,
        status=status_name,
        status_color_token=status_color,
        created_at=experience.created_at,
        updated_at=experience.updated_at,
        translations={
            t.locale: ExperienceLocaleFieldsOut(
                context=t.context,
                outcome=t.outcome,
                problem=t.problem,
                scope=t.scope,
                solution_what=t.solution_what,
                tech_stack=t.tech_stack,
                evidence=t.evidence,
            )
            for t in experience.translations
        },
        decisions=[
            DecisionOut(
                id=decision.id,
                sort=decision.sort,
                translations={
                    t.locale: DecisionLocaleFieldsOut(title=t.title, body=t.body, discarded=t.discarded)
                    for t in decision.translations
                },
            )
            for decision in experience.decisions
        ],
        proofs=[
            ProofOut(
                id=proof.id,
                sort=proof.sort,
                translations={t.locale: ProofLocaleFieldsOut(text=t.text) for t in proof.translations},
            )
            for proof in experience.proofs
        ],
    )


def _with_children(stmt: Select[Any]) -> Select[Any]:
    """Eager-loads translation/decision/proof levels on an experience select."""
    return stmt.options(
        selectinload(Experience.translations),
        selectinload(Experience.decisions).selectinload(ExperienceDecision.translations),
        selectinload(Experience.proofs).selectinload(ExperienceProof.translations),
    )


async def get_by_profile(
    db: AsyncSession,
    profile_id: int,
    active_only: bool = False,
) -> list[tuple[ExperienceOut, str | None, str | None]]:
    """Returns all experience projects for a profile with core status.

    Sorted by ``sort`` ASC, eager-loading ``translations``, ``decisions``
    (incl. translations) and ``proofs`` (incl. translations).

    Args:
        db: Active async DB session.
        profile_id: The application_profile id.
        active_only: If True, only returns rows with status='active'.

    Returns:
        List of (ExperienceOut, status_name, status_color_token) tuples.
    """
    stmt: Select[Any] = _with_children(
        select(
            Experience,
            Status.name.label("status_name"),
            Status.color_token.label("status_color_token"),
        )
        .outerjoin(
            Statusable,
            (Statusable.statusable_type == _STATABLE_TYPE) & (Statusable.statusable_id == Experience.id),
        )
        .outerjoin(Status, Status.id == Statusable.status_id)
        .where(Experience.application_profile_id == profile_id)
        .order_by(asc(Experience.sort))
    )
    if active_only:
        stmt = stmt.where(Status.name == "active")
    result = await db.execute(stmt)
    return [(_to_out(row[0], row[1], row[2]), row[1], row[2]) for row in result.all()]


async def get_by_id(db: AsyncSession, experience_id: int) -> ExperienceOut | None:
    """Returns a single experience project by id as DTO or None (children loaded)."""
    result = await db.execute(_with_children(select(Experience)).where(Experience.id == experience_id))
    experience = result.scalar_one_or_none()
    return _to_out(experience, None, None) if experience is not None else None


async def get_max_sort(db: AsyncSession, profile_id: int) -> int:
    """Returns the highest ``sort`` value for a profile's experiences (0 if none)."""
    return await repository_helpers.get_max_sort(
        db,
        model=Experience,
        scope_attr=Experience.application_profile_id,
        scope_value=profile_id,
    )


async def _replace_levels(
    db: AsyncSession,
    experience: Experience,
    *,
    translations: Mapping[str, ExperienceLocaleFieldsOut] | None,
    decisions: Sequence[DecisionIn] | None,
    proofs: Sequence[ProofIn] | None,
) -> None:
    """Replaces the child levels set (``None`` levels stay untouched)."""
    if translations is not None:
        await experience_translation_repository.replace_translations(db, experience, translations)
    if decisions is not None:
        await experience_children_repository.replace_decisions(db, experience, decisions)
    if proofs is not None:
        await experience_children_repository.replace_proofs(db, experience, proofs)


async def create(
    db: AsyncSession,
    *,
    application_profile_id: int,
    position: str,
    start_date: date,
    sort: int,
    company: str | None = None,
    project_url: str | None = None,
    end_date: date | None = None,
    translations: Mapping[str, ExperienceLocaleFieldsOut] | None = None,
    decisions: Sequence[DecisionIn] | None = None,
    proofs: Sequence[ProofIn] | None = None,
) -> ExperienceOut:
    """Builds and persists a new experience project with its child levels."""
    experience = Experience(
        application_profile_id=application_profile_id,
        position=position,
        company=company,
        project_url=project_url,
        start_date=start_date,
        end_date=end_date,
        sort=sort,
    )
    db.add(experience)
    await db.flush()
    await db.refresh(experience)
    await _replace_levels(db, experience, translations=translations, decisions=decisions, proofs=proofs)
    created = await get_by_id(db, experience.id)
    if created is None:
        raise RuntimeError("experience vanished after create")
    return created


async def update(
    db: AsyncSession,
    experience_id: int,
    *,
    changes: Mapping[str, object],
    translations: Mapping[str, ExperienceLocaleFieldsOut] | None = None,
    decisions: Sequence[DecisionIn] | None = None,
    proofs: Sequence[ProofIn] | None = None,
) -> ExperienceOut | None:
    """Applies scalar changes + replaces the set child levels of an experience."""
    result = await db.execute(select(Experience).where(Experience.id == experience_id))
    experience = result.scalar_one_or_none()
    if experience is None:
        return None
    for key, value in changes.items():
        setattr(experience, key, value)
    await db.flush()
    await _replace_levels(db, experience, translations=translations, decisions=decisions, proofs=proofs)
    return await get_by_id(db, experience_id)


async def delete(db: AsyncSession, experience_id: int) -> None:
    """Deletes an experience project by id (children cascade via relationship)."""
    result = await db.execute(select(Experience).where(Experience.id == experience_id))
    experience = result.scalar_one_or_none()
    if experience is not None:
        await db.delete(experience)
        await db.flush()


async def reorder(
    db: AsyncSession,
    profile_id: int,
    ordered_ids: list[int],
) -> list[tuple[ExperienceOut, str | None, str | None]]:
    """Updates ``sort`` for multiple experiences based on the ordered id list.

    Args:
        db: Active async DB session.
        profile_id: The application_profile id to scope the update.
        ordered_ids: Experience ids in desired order (index = sort).

    Returns:
        The re-sorted list of experiences (with status and child levels).
    """
    await repository_helpers.reorder(
        db,
        model=Experience,
        scope_attr=Experience.application_profile_id,
        scope_value=profile_id,
        ordered_ids=ordered_ids,
    )
    return await get_by_profile(db, profile_id)
