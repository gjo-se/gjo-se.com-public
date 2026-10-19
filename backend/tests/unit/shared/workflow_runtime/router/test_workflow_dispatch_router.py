"""Unit tests for the workflow task router surfaces (split enqueue vs. status)."""

from __future__ import annotations

from typing import Any

import pytest
from fastapi import APIRouter, HTTPException
from pydantic import ValidationError

from app.shared.workflow_runtime.router import workflow_dispatch_router as svc
from app.shared.workflow_runtime.router.workflow_dispatch_router import (
    BulkMergeRequest,
    ResearchEndcustomerRequest,
    bulk_merge,
    research_endcustomer,
    task_dispatch_router,
)
from app.shared.workflow_runtime.router.workflow_router import task_router

pytestmark = pytest.mark.unit


def _paths(router: APIRouter) -> set[str]:
    return {route.path for route in router.routes}


def test_dispatch_router_exposes_enqueue_endpoints() -> None:
    """The dispatch router owns the enqueue endpoints."""
    assert isinstance(task_dispatch_router, APIRouter)
    assert {"/tasks/bulk-merge", "/tasks/research-endcustomer"} <= _paths(task_dispatch_router)


def test_status_router_exposes_query_endpoints() -> None:
    """The status router owns the polling/query endpoints."""
    assert isinstance(task_router, APIRouter)
    assert {"/tasks/{task_id}", "/tasks/bulk-status", "/tasks/{task_id}/progress"} <= _paths(task_router)


# ── request-body constraints ─────────────────────────────────────────────────


def test_bulk_merge_request_requires_between_1_and_100_ids() -> None:
    """The project_ids list must hold 1..100 entries."""
    with pytest.raises(ValidationError):
        BulkMergeRequest(project_ids=[])
    with pytest.raises(ValidationError):
        BulkMergeRequest(project_ids=list(range(101)))
    assert BulkMergeRequest(project_ids=[1]).project_ids == [1]


def test_research_request_bounds_stop_after_act() -> None:
    """stop_after_act must be within 1..8 when provided."""
    assert ResearchEndcustomerRequest(project_id=1).stop_after_act is None
    assert ResearchEndcustomerRequest(project_id=1, stop_after_act=8).stop_after_act == 8
    with pytest.raises(ValidationError):
        ResearchEndcustomerRequest(project_id=1, stop_after_act=0)
    with pytest.raises(ValidationError):
        ResearchEndcustomerRequest(project_id=1, stop_after_act=9)


# ── bulk_merge endpoint ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_bulk_merge_enqueues_each_project(monkeypatch: pytest.MonkeyPatch) -> None:
    """Each project id yields a TaskRef with the enqueued task id."""
    seen: list[tuple[int, str]] = []

    async def _enqueue(pid: int, *, trigger: str) -> str:
        seen.append((pid, trigger))
        return f"task-{pid}"

    monkeypatch.setattr(svc, "enqueue_merge", _enqueue)

    out = await bulk_merge(BulkMergeRequest(project_ids=[3, 5]), None)
    assert [(t.project_id, t.task_id) for t in out.tasks] == [(3, "task-3"), (5, "task-5")]
    assert seen == [(3, "bulk"), (5, "bulk")]


@pytest.mark.asyncio
async def test_bulk_merge_restate_error_becomes_503(monkeypatch: pytest.MonkeyPatch) -> None:
    """A Restate RuntimeError is mapped to HTTP 503."""

    async def _boom(_pid: int, *, trigger: str) -> str:
        raise RuntimeError("restate down")

    monkeypatch.setattr(svc, "enqueue_merge", _boom)

    with pytest.raises(HTTPException) as exc_info:
        await bulk_merge(BulkMergeRequest(project_ids=[1]), None)
    assert exc_info.value.status_code == 503


# ── research_endcustomer endpoint ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_research_endcustomer_selects_trigger_and_task(monkeypatch: pytest.MonkeyPatch) -> None:
    """A set stop_after_act selects the 'act-test' trigger; None selects 'button'."""
    calls: list[dict[str, Any]] = []

    async def _enqueue(pid: int, *, trigger: str, stop_after_act: int | None) -> str:
        calls.append({"pid": pid, "trigger": trigger, "stop_after_act": stop_after_act})
        return "t-1"

    monkeypatch.setattr(svc, "enqueue_endcustomer_research", _enqueue)

    out = await research_endcustomer(ResearchEndcustomerRequest(project_id=7, stop_after_act=3), None)
    assert out.task_id == "t-1"
    assert out.project_id == 7
    assert calls[0] == {"pid": 7, "trigger": "act-test", "stop_after_act": 3}

    await research_endcustomer(ResearchEndcustomerRequest(project_id=7), None)
    assert calls[1]["trigger"] == "button"
