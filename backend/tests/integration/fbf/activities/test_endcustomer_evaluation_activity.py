"""Integration tests for the ``endcustomer_evaluation`` activity (Act 7).

The LLM call (task ``endcustomer-evaluation``) is replaced by the deterministic
``llm_double``; candidate selection and persistence of ``confidence`` /
``reasoning`` run against the real container database.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.activities import endcustomer_evaluation_activity
from app.fbf.models.project import Project
from app.fbf.repositories import project_endcustomer_candidate_repository as candidate_repository
from app.fbf.schemas.endcustomer_schemas import EndcustomerEvaluationOut
from app.shared.status.models.status import Statusable
from tests.reference_seed import ReferenceSeedData

pytestmark = pytest.mark.integration


async def _add_pending_candidate(
    db: AsyncSession,
    project_id: int,
    *,
    pending_status_id: int,
    name: str,
    career_page_description: str | None,
    similarity: float,
    confidence: float,
) -> int:
    """Persist a pending candidate carrying similarity and a page description."""
    candidate = await candidate_repository.create(
        db,
        project_id=project_id,
        company_name=name,
        source="brave",
        career_page_description=career_page_description,
        confidence=confidence,
    )
    candidate.similarity_to_project = similarity
    db.add(
        Statusable(
            status_id=pending_status_id,
            statusable_type="project_endcustomer_candidate",
            statusable_id=candidate.id,
        )
    )
    return candidate.id


async def test_run_evaluates_only_candidates_with_description_and_similarity(
    reference_seed: ReferenceSeedData,
    db_session: AsyncSession,
    llm_double,
) -> None:
    """Only candidates with a page text are evaluated; the LLM score is persisted."""
    pending_status_id = reference_seed["project_endcustomer_candidate"]["pending"].id
    project = Project(url="https://example.test/projects/evaluation", title="Evaluation")
    db_session.add(project)
    await db_session.flush()
    project_id = project.id
    evaluated_id = await _add_pending_candidate(
        db_session,
        project_id,
        pending_status_id=pending_status_id,
        name="Beispielkunde GmbH",
        career_page_description="Karriereseiten-Text der Beispielkunde.",
        similarity=0.8,
        confidence=0.2,
    )
    skipped_id = await _add_pending_candidate(
        db_session,
        project_id,
        pending_status_id=pending_status_id,
        name="Ohne Text GmbH",
        career_page_description=None,
        similarity=0.5,
        confidence=0.2,
    )
    await db_session.commit()

    llm_double.set_response(
        "endcustomer-evaluation",
        EndcustomerEvaluationOut(confidence=0.81, reasoning="starke Übereinstimmung"),
    )

    result = await endcustomer_evaluation_activity.run(MagicMock(), {"project_id": project_id, "signals": {}})

    assert result == {"project_id": project_id, "evaluated": 1}

    db_session.expire_all()
    stored = {c.id: c for c in await candidate_repository.get_by_project(db_session, project_id)}
    assert stored[evaluated_id].confidence == pytest.approx(0.81)
    assert stored[evaluated_id].reasoning == "starke Übereinstimmung"
    assert stored[skipped_id].confidence == pytest.approx(0.2)
    assert stored[skipped_id].reasoning is None


async def test_run_evaluates_nothing_when_no_candidates_exist(db_session: AsyncSession, llm_double) -> None:
    """A project without candidates results in zero evaluations."""
    project = Project(url="https://example.test/projects/evaluation-empty", title="Evaluation Empty")
    db_session.add(project)
    await db_session.flush()
    project_id = project.id
    await db_session.commit()

    result = await endcustomer_evaluation_activity.run(MagicMock(), {"project_id": project_id, "signals": {}})

    assert result == {"project_id": project_id, "evaluated": 0}
