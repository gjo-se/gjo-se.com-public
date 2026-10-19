"""Integration tests for the ``merge_activity`` (description merge).

The LLM call is replaced by the deterministic ``llm_double`` (text-mode task
``description-merge``); the merge result is persisted on the master project in
the real container database.
"""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.activities import merge_activity
from app.fbf.models.project import Project
from app.fbf.repositories import project_repository

pytestmark = pytest.mark.integration

_FROZEN_NOW = datetime(2026, 1, 1, tzinfo=UTC)
_MERGED_TEXT = "Zusammengeführte Beschreibung DE"


async def test_run_merges_master_and_slaves_and_persists_result(
    db_session: AsyncSession,
    llm_double,
    frozen_time,
) -> None:
    """The merged text is written to the master's ``merged_description_de``."""
    master = Project(url="https://example.test/projects/merge-master", title="Merge Master", description="Master-Text")
    db_session.add(master)
    await db_session.flush()
    master_id = master.id
    db_session.add(
        Project(
            url="https://example.test/projects/merge-slave",
            title="Merge Slave",
            description="Slave-Text",
            canonical_id=master_id,
        )
    )
    await db_session.commit()

    llm_double.set_response("description-merge", _MERGED_TEXT)

    with frozen_time(_FROZEN_NOW):
        result = await merge_activity.run(MagicMock(), {"project_id": master_id, "trigger": "pipeline"})

    assert result == {"ok": True, "merged_text": _MERGED_TEXT, "project_id": master_id}

    db_session.expire_all()
    stored = await project_repository.get_by_id(db_session, master_id)
    assert stored is not None
    assert stored.merged_description_de == _MERGED_TEXT
    assert stored.merged_at == _FROZEN_NOW


async def test_run_returns_failure_when_project_missing(db_session: AsyncSession, llm_double) -> None:
    """A missing master yields a plain failure result instead of an exception."""
    result = await merge_activity.run(MagicMock(), {"project_id": 999999, "trigger": "pipeline"})

    assert result["ok"] is False
    assert result["project_id"] == 999999
    assert result["error"] == "Project 999999 not found"
