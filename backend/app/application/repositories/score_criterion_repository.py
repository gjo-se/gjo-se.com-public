"""Database access for application score criteria (gjo_se_com).

Reads and writes return ``ScoreCriterionOut`` DTOs (never ORM models) so the
service layer stays free of ``app.<ctx>.models`` imports (Achse 2: ``services`` >
``repositories``).
"""

from decimal import Decimal

from sqlalchemy import asc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.domain.application_score_rubric_rules import (
    CANONICAL_CRITERIA_KEYS,
    CriterionScore,
    missing_criterion,
)
from app.application.models.score_criterion import (
    ScoreCriterion,
)
from app.application.schemas.score_schemas import ScoreCriterionOut


def _to_out(criterion: ScoreCriterion) -> ScoreCriterionOut:
    """Maps a score criterion ORM row to its DTO."""
    return ScoreCriterionOut.model_validate(criterion)


async def create_rows(db: AsyncSession, run_id: int, scores: list[CriterionScore]) -> list[ScoreCriterionOut]:
    """Builds and persists exactly the canon-ordered criterion rows for a run.

    Args:
        db: Active async DB session.
        run_id: Score run id the rows belong to.
        scores: Assessed hard + content criterion scores.

    Returns:
        The persisted, canon-ordered criterion DTOs (exactly 11).
    """
    by_key = {score.key: score for score in scores}
    ordered = [by_key.get(key) or missing_criterion(key) for key in CANONICAL_CRITERIA_KEYS]
    rows = [
        ScoreCriterion(
            score_run_id=run_id,
            criterion_key=score.key,
            group_key=score.group,
            value=(Decimal(str(round(score.value, 4))) if score.value is not None else None),
            weight=score.weight,
            reason=score.reason,
            evidence=score.evidence,
            action=score.action,
        )
        for score in ordered
    ]
    db.add_all(rows)
    await db.flush()
    return [_to_out(row) for row in rows]


async def list_by_run(db: AsyncSession, score_run_id: int) -> list[ScoreCriterionOut]:
    """Returns all criteria of a score run in stable ascending id order as DTOs."""
    result = await db.execute(
        select(ScoreCriterion).where(ScoreCriterion.score_run_id == score_run_id).order_by(asc(ScoreCriterion.id))
    )
    return [_to_out(criterion) for criterion in result.scalars().all()]
