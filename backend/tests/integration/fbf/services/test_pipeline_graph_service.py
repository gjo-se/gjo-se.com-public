"""Integration tests for ``pipeline_graph_service`` against the container DB.

Drives the compiled LangGraph through :func:`get_graph` – the SSOT wiring for the
merge→extract chain. The merge/extract services are deterministic doubles (no
LLM call); the graph opens its sessions through the container-bound session
factory, so the runner path is exercised end to end.
"""

from __future__ import annotations

from collections.abc import AsyncIterator, Callable
from typing import Any, cast

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.services.description_merge_service import DescriptionMergeService
from app.fbf.services.pipeline_graph_service import get_graph
from app.fbf.services.skill_extraction_service import SkillExtractionService

pytestmark = pytest.mark.integration

_MERGED_TEXT = "merged project text"


class _FakeMergeService:
    """Deterministic merge double – yields a fixed text, no LLM call."""

    async def resolve_group(
        self,
        gjo_db: AsyncSession,
        core_db: AsyncSession,
        project_id: int,
        trigger: str | None = None,
    ) -> None:
        """Accept the resolve pre-flight without touching any provider."""
        return

    async def merge_group_stream(
        self,
        gjo_db: AsyncSession,
        core_db: AsyncSession,
        project_id: int,
        trigger: str | None = None,
    ) -> AsyncIterator[str]:
        """Yield the deterministic merged text."""
        yield _MERGED_TEXT


class _FakeExtractService:
    """No-op skill-extraction double – no LLM call."""

    async def extract_for_master(self, gjo_db: AsyncSession, core_db: AsyncSession, project_id: int) -> None:
        """Accept the extraction call without touching any provider."""
        return


def _getters() -> tuple[Callable[[], DescriptionMergeService], Callable[[], SkillExtractionService]]:
    """Return the wired service getters backed by the deterministic doubles."""
    merge: Callable[[], DescriptionMergeService] = cast("Callable[[], DescriptionMergeService]", _FakeMergeService)
    extract: Callable[[], SkillExtractionService] = cast("Callable[[], SkillExtractionService]", _FakeExtractService)
    return merge, extract


async def test_graph_runs_merge_then_extract_and_accumulates_text() -> None:
    """Without ``skip_merge`` the merge node streams text, then extraction runs."""
    merge_getter, extract_getter = _getters()
    graph = get_graph(merge_getter, extract_getter)

    result: dict[str, Any] = await graph.ainvoke({"project_id": 1})

    assert result["merged_text"] == _MERGED_TEXT
    assert result["status"] == "extracted"


async def test_graph_skips_merge_when_flagged() -> None:
    """With ``skip_merge`` the merge node is bypassed and only extraction runs."""
    merge_getter, extract_getter = _getters()
    graph = get_graph(merge_getter, extract_getter)

    result: dict[str, Any] = await graph.ainvoke({"project_id": 1, "skip_merge": True})

    assert "merged_text" not in result
    assert result["status"] == "extracted"
