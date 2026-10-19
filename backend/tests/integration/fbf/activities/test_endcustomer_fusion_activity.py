"""Integration tests for the ``endcustomer_fusion`` activity (Act 8).

The LLM call (task ``endcustomer-fusion``) is replaced by the deterministic
``llm_double``; grouping, merging of duplicates and rejection of unmatched
candidates run against the real container database.
"""

from __future__ import annotations

from collections.abc import Callable
from unittest.mock import MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.activities import endcustomer_fusion_activity
from app.fbf.models.project import Project
from app.fbf.repositories import project_endcustomer_candidate_read_repository as candidate_read_repository
from app.fbf.repositories import project_endcustomer_candidate_repository as candidate_repository
from app.fbf.schemas.endcustomer_schemas import EndcustomerCandidateOut, EndcustomerFusionResultOut
from app.shared.status.models.status import Statusable
from tests.reference_seed import ReferenceSeedData

pytestmark = pytest.mark.integration


class _TrackingSessionFactory:
    """Wrap the bound session factory and close every opened session afterwards.

    The activity reuses its Phase-1 session after the ``async with`` block closed
    it – a closed ``AsyncSession`` reopens a connection on the next use. That
    lingering session keeps an ACCESS SHARE lock that would deadlock the
    ``TRUNCATE`` teardown. Tracking and closing the sessions here keeps the run
    hermetic without touching application code.
    """

    def __init__(self, factory: Callable[[], AsyncSession]) -> None:
        self._factory = factory
        self._sessions: list[AsyncSession] = []

    def __call__(self) -> AsyncSession:
        """Return a new session from the wrapped factory and remember it."""
        session = self._factory()
        self._sessions.append(session)
        return session

    async def close_all(self) -> None:
        """Close every session handed out so their connections release their locks."""
        for session in self._sessions:
            await session.close()


async def _add_pending_candidate(
    db: AsyncSession,
    project_id: int,
    *,
    pending_status_id: int,
    name: str,
    source: str,
    confidence: float,
) -> int:
    """Persist a pending candidate with a confidence score."""
    candidate = await candidate_repository.create(
        db,
        project_id=project_id,
        company_name=name,
        source=source,
        confidence=confidence,
    )
    db.add(
        Statusable(
            status_id=pending_status_id,
            statusable_type="project_endcustomer_candidate",
            statusable_id=candidate.id,
        )
    )
    return candidate.id


async def test_run_merges_duplicates_and_rejects_unmatched(
    reference_seed: ReferenceSeedData,
    db_session: AsyncSession,
    llm_double,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Two same-name candidates merge into one keeper; the rest become rejected."""
    pending_status_id = reference_seed["project_endcustomer_candidate"]["pending"].id
    project = Project(url="https://example.test/projects/fusion", title="Fusion")
    db_session.add(project)
    await db_session.flush()
    project_id = project.id
    await _add_pending_candidate(
        db_session,
        project_id,
        pending_status_id=pending_status_id,
        name="Beispielkunde GmbH",
        source="brave",
        confidence=0.5,
    )
    await _add_pending_candidate(
        db_session,
        project_id,
        pending_status_id=pending_status_id,
        name="Beispielkunde GmbH",
        source="tavily",
        confidence=0.6,
    )
    await _add_pending_candidate(
        db_session, project_id, pending_status_id=pending_status_id, name="Andere GmbH", source="brave", confidence=0.4
    )
    await db_session.commit()

    llm_double.set_response(
        "endcustomer-fusion",
        EndcustomerFusionResultOut(
            candidates=[
                EndcustomerCandidateOut(
                    company_name="Beispielkunde GmbH",
                    confidence=0.9,
                    source="both",
                    reasoning="merged",
                )
            ]
        ),
    )

    tracker = _TrackingSessionFactory(endcustomer_fusion_activity.GjoDB)
    monkeypatch.setattr(endcustomer_fusion_activity, "GjoDB", tracker)

    result = await endcustomer_fusion_activity.run(MagicMock(), {"project_id": project_id})
    await tracker.close_all()

    assert result == {"project_id": project_id, "fused": 1, "rejected": 2}

    db_session.expire_all()
    rows = await candidate_read_repository.get_by_project_rows(db_session, project_id)
    beispiel_rows = [row for row in rows if row.candidate.company_name == "Beispielkunde GmbH"]
    keepers = [row for row in beispiel_rows if row.candidate.source == "both"]
    assert len(keepers) == 1
    assert keepers[0].candidate.confidence == pytest.approx(0.9)
    assert keepers[0].candidate.reasoning == "merged"
    merged_away = [row for row in beispiel_rows if row.candidate.source != "both"]
    assert len(merged_away) == 1
    assert merged_away[0].status == "rejected"
    andere = next(row for row in rows if row.candidate.company_name == "Andere GmbH")
    assert andere.status == "rejected"


async def test_run_fuses_nothing_when_no_pending_candidates_exist(
    reference_seed: ReferenceSeedData,
    db_session: AsyncSession,
    llm_double,
) -> None:
    """A project without pending candidates fuses and rejects nothing."""
    project = Project(url="https://example.test/projects/fusion-empty", title="Fusion Empty")
    db_session.add(project)
    await db_session.flush()
    project_id = project.id
    await db_session.commit()

    result = await endcustomer_fusion_activity.run(MagicMock(), {"project_id": project_id})

    assert result == {"project_id": project_id, "fused": 0, "rejected": 0}
