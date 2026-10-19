"""Decision/proof child writes for application experience projects.

Extracted from ``experience_repository``: the decision and proof replacement use
the same delete-then-rebuild pattern and share the ordered-child-input protocol.
"""

from collections.abc import Mapping, Sequence
from typing import Any, Protocol

from sqlalchemy import delete as delete_stmt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.models.experience import Experience
from app.application.models.experience_decision import ExperienceDecision
from app.application.models.experience_decision_translation import ExperienceDecisionTranslation
from app.application.models.experience_proof import ExperienceProof
from app.application.models.experience_proof_translation import ExperienceProofTranslation


class _ChildTranslationsInput(Protocol):
    """Structural type for a decision/proof input carrying its translations map."""

    @property
    def translations(self) -> Mapping[str, Any] | None: ...


async def replace_decisions(
    db: AsyncSession,
    experience: Experience,
    decisions: Sequence[_ChildTranslationsInput],
) -> None:
    """Replaces all decision rows of *experience* with *decisions*.

    Deletes every existing decision (and its translations) of the experience,
    then rebuilds the list in one flush. The list order defines ``sort``
    (index = sort).

    Args:
        db: Active async DB session.
        experience: Experience whose decisions are replaced.
        decisions: Fully ordered decision inputs, each carrying its translations.
    """
    decision_ids = select(ExperienceDecision.id).where(ExperienceDecision.experience_id == experience.id)
    _ = await db.execute(
        delete_stmt(ExperienceDecisionTranslation).where(ExperienceDecisionTranslation.decision_id.in_(decision_ids))
    )
    _ = await db.execute(delete_stmt(ExperienceDecision).where(ExperienceDecision.experience_id == experience.id))
    for index, decision_in in enumerate(decisions):
        decision = ExperienceDecision(experience_id=experience.id, sort=index)
        db.add(decision)
        await db.flush()
        db.add_all(
            ExperienceDecisionTranslation(
                decision_id=decision.id,
                locale=locale,
                **fields.model_dump(),
            )
            for locale, fields in (decision_in.translations or {}).items()
        )
    await db.flush()


async def replace_proofs(
    db: AsyncSession,
    experience: Experience,
    proofs: Sequence[_ChildTranslationsInput],
) -> None:
    """Replaces all proof rows of *experience* with *proofs*.

    Deletes every existing proof (and its translations) of the experience, then
    rebuilds the list in one flush. The list order defines ``sort``
    (index = sort).

    Args:
        db: Active async DB session.
        experience: Experience whose proofs are replaced.
        proofs: Fully ordered proof inputs, each carrying its translations.
    """
    proof_ids = select(ExperienceProof.id).where(ExperienceProof.experience_id == experience.id)
    _ = await db.execute(
        delete_stmt(ExperienceProofTranslation).where(ExperienceProofTranslation.proof_id.in_(proof_ids))
    )
    _ = await db.execute(delete_stmt(ExperienceProof).where(ExperienceProof.experience_id == experience.id))
    for index, proof_in in enumerate(proofs):
        proof = ExperienceProof(experience_id=experience.id, sort=index)
        db.add(proof)
        await db.flush()
        db.add_all(
            ExperienceProofTranslation(
                proof_id=proof.id,
                locale=locale,
                **fields.model_dump(),
            )
            for locale, fields in (proof_in.translations or {}).items()
        )
    await db.flush()
