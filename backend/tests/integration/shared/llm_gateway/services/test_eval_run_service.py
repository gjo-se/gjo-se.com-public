"""Integration tests for the evaluation-run CRUD service."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.llm_gateway.schemas.eval_run_schemas import EvalRunCreate
from app.shared.llm_gateway.services.eval_run_service import EvalRunService


@pytest.mark.integration
async def test_create_persists_the_run(db_session: AsyncSession) -> None:
    """A created run is persisted with its status and trigger."""
    service = EvalRunService(db_session)

    run = await service.create(EvalRunCreate(task="description-merge", trigger="manual", overall_status="passed"))

    assert run.id is not None
    assert run.task == "description-merge"
    assert run.overall_status == "passed"


@pytest.mark.integration
async def test_list_by_task_returns_only_matching_runs(db_session: AsyncSession) -> None:
    """Listing by task excludes runs of other tasks."""
    service = EvalRunService(db_session)
    await service.create(EvalRunCreate(task="description-merge", trigger="manual", overall_status="passed"))
    await service.create(EvalRunCreate(task="other-task", trigger="manual", overall_status="failed"))

    runs = await service.list_by_task("description-merge")

    assert len(runs) == 1
    assert runs[0].task == "description-merge"


@pytest.mark.integration
async def test_list_by_task_respects_the_limit(db_session: AsyncSession) -> None:
    """The limit caps the number of returned runs."""
    service = EvalRunService(db_session)
    for _ in range(3):
        await service.create(EvalRunCreate(task="description-merge", trigger="manual", overall_status="passed"))

    runs = await service.list_by_task("description-merge", limit=2)

    assert len(runs) == 2
