"""Integration tests for the ``endcustomer_embedding`` activity (Act 6).

The OpenRouter embedding call is replaced by a deterministic client double (no
network access). The cosine similarity against the master-project vector and the
persisted ``similarity_to_project`` run against the real container database.
"""

from __future__ import annotations

from typing import override
from unittest.mock import MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.activities import endcustomer_embedding_activity
from app.fbf.models.project import Project
from app.fbf.repositories import project_endcustomer_candidate_repository as candidate_repository
from app.shared.embedding.infrastructure.embedding_client import EmbeddingClient
from app.shared.status.models.status import Statusable
from tests.reference_seed import ReferenceSeedData

pytestmark = pytest.mark.integration

_VECTOR: list[float] = [1.0, 0.0, 0.0]


class _StubEmbeddingClient(EmbeddingClient):
    """Deterministic embedding double – fixed vector, never hits OpenRouter."""

    @override
    async def embed_text(self, text: str, db: AsyncSession) -> list[float]:
        """Return a fixed vector regardless of the input text."""
        return list(_VECTOR)


async def _add_pending_candidate(
    db: AsyncSession,
    project_id: int,
    *,
    name: str,
    career_page_description: str | None,
    pending_status_id: int,
) -> int:
    """Persist a candidate and mark it ``pending`` via ``core_statusable``."""
    candidate = await candidate_repository.create(
        db,
        project_id=project_id,
        company_name=name,
        source="brave",
        career_page_description=career_page_description,
    )
    db.add(
        Statusable(
            status_id=pending_status_id,
            statusable_type="project_endcustomer_candidate",
            statusable_id=candidate.id,
        )
    )
    return candidate.id


async def test_run_embeds_pending_candidates_and_persists_similarity(
    reference_seed: ReferenceSeedData,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Only candidates with a page text are embedded; the cosine score is persisted."""
    pending_status_id = reference_seed["project_endcustomer_candidate"]["pending"].id
    vector_master = Project(url="https://example.test/projects/embedding-master", title="Vector Master", vector=_VECTOR)
    db_session.add(vector_master)
    await db_session.flush()
    target = Project(url="https://example.test/projects/embedding-target", title="Embedding Target")
    db_session.add(target)
    await db_session.flush()
    target_id = target.id
    embedded_id = await _add_pending_candidate(
        db_session,
        target_id,
        name="Beispielkunde GmbH",
        career_page_description="Karriereseiten-Text der Beispielkunde.",
        pending_status_id=pending_status_id,
    )
    skipped_id = await _add_pending_candidate(
        db_session,
        target_id,
        name="Ohne Text GmbH",
        career_page_description=None,
        pending_status_id=pending_status_id,
    )
    await db_session.commit()

    monkeypatch.setattr(endcustomer_embedding_activity, "get_embedding_client", _StubEmbeddingClient)

    result = await endcustomer_embedding_activity.run(MagicMock(), {"project_id": target_id})

    assert result == {"project_id": target_id, "embedded": 1}

    db_session.expire_all()
    stored = {candidate.id: candidate for candidate in await candidate_repository.get_by_project(db_session, target_id)}
    assert stored[embedded_id].similarity_to_project == pytest.approx(1.0)
    assert stored[skipped_id].similarity_to_project is None
