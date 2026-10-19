"""Unit tests for ``pipeline_graph_service`` (graph shape + node behaviour, no DB)."""

from __future__ import annotations

from collections.abc import Callable
from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock

import pytest
from langgraph.graph.state import CompiledStateGraph

from app.fbf.repositories import project_repository
from app.fbf.services.description_merge_service import DescriptionMergeService
from app.fbf.services.pipeline_graph_service import get_graph
from app.fbf.services.skill_extraction_service import SkillExtractionService

pytestmark = pytest.mark.unit


def _placeholder_service() -> object:
    """Return a placeholder service (never invoked during graph construction)."""
    return object()


def _patch_sessions(monkeypatch: pytest.MonkeyPatch) -> None:
    """Replace the repository session factory with an in-memory context manager."""

    class _Ctx:
        async def __aenter__(self) -> object:
            return SimpleNamespace()

        async def __aexit__(self, *_exc: object) -> bool:
            return False

    monkeypatch.setattr(project_repository, "open_session", _Ctx)


def _extract_stub() -> SimpleNamespace:
    return SimpleNamespace(extract_for_master=AsyncMock())


def test_get_graph_compiles_with_merge_and_extract_nodes() -> None:
    """The builder compiles a graph exposing the merge- and extract-nodes."""
    graph = get_graph(
        cast("Callable[[], DescriptionMergeService]", _placeholder_service),
        cast("Callable[[], SkillExtractionService]", _placeholder_service),
    )

    assert isinstance(graph, CompiledStateGraph)
    assert {"merge_description", "extract_skills"} <= set(graph.nodes)


@pytest.mark.asyncio
async def test_skip_merge_short_circuits_before_building_merge_service(monkeypatch: pytest.MonkeyPatch) -> None:
    """With ``skip_merge`` set the merge service is never resolved."""

    def _forbidden_getter() -> object:
        raise AssertionError("merge service must not be built when skip_merge is set")

    graph = get_graph(
        cast("Callable[[], DescriptionMergeService]", _forbidden_getter),
        cast("Callable[[], SkillExtractionService]", _extract_stub),
    )
    _patch_sessions(monkeypatch)

    result = await graph.ainvoke({"project_id": 1, "skip_merge": True})

    assert result["status"] == "extracted"
    assert "merged_text" not in result


@pytest.mark.asyncio
async def test_merge_node_accumulates_streamed_chunks(monkeypatch: pytest.MonkeyPatch) -> None:
    """The merge node concatenates every streamed chunk into ``merged_text``."""

    class _MergeService:
        async def resolve_group(self, *_args: object, **_kwargs: object) -> None:
            return None

        async def merge_group_stream(self, *_args: object, **_kwargs: object) -> Any:
            for chunk in ("aa", "bb"):
                yield chunk

    graph = get_graph(
        cast("Callable[[], DescriptionMergeService]", _MergeService),
        cast("Callable[[], SkillExtractionService]", _extract_stub),
    )
    _patch_sessions(monkeypatch)

    result = await graph.ainvoke({"project_id": 1})

    assert result["merged_text"] == "aabb"
    assert result["status"] == "extracted"
