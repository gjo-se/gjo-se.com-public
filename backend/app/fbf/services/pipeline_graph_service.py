"""LangGraph StateGraph pipeline: description-merge → skill-extraction.

This is the **SSOT** for all post-merge LLM workflow chains.
Both the HTTP streaming endpoint and the arq worker execute the same
compiled graph.

The graph is **decoupled from the DI providers** (``app.fbf.dependencies.fbf_dependencies``):
the caller passes the merge/extract service getters, so this ``services``
module never imports the wiring layer (``services → dependencies`` would be a
layer violation). Graph construction is cheap; the caller may cache if needed.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import structlog
from langgraph.graph import END, StateGraph
from langgraph.graph.state import CompiledStateGraph

from app.fbf.services.description_merge_service import DescriptionMergeService
from app.fbf.services.skill_extraction_service import SkillExtractionService
from app.fbf.services.state_service import PipelineState
from app.shared.llm_gateway.domain.task_registry_rules import DescriptionMergeTrigger

logger = structlog.get_logger(__name__)


def get_graph(
    merge_service_getter: Callable[[], DescriptionMergeService],
    extract_service_getter: Callable[[], SkillExtractionService],
) -> CompiledStateGraph[PipelineState, Any, Any, Any]:
    """Build and compile the pipeline graph wired to the given service getters.

    Args:
        merge_service_getter: Provider for the description-merge service.
        extract_service_getter: Provider for the skill-extraction service.

    Returns:
        Compiled StateGraph whose nodes resolve their service via the getters.
    """
    return _build(merge_service_getter, extract_service_getter)


# ── Graph builder ────────────────────────────────────────────────────────────


def _build(
    merge_service_getter: Callable[[], DescriptionMergeService],
    extract_service_getter: Callable[[], SkillExtractionService],
) -> CompiledStateGraph[PipelineState, Any, Any, Any]:
    """Build and compile the pipeline StateGraph."""

    async def _merge_node(state: PipelineState) -> dict[str, Any]:
        """Execute the description-merge (or skip if already done)."""
        if state.get("skip_merge"):
            return {"status": "merge-skipped"}

        from app.fbf.repositories import project_repository

        project_id = state["project_id"]
        async with project_repository.open_session() as gjo_db, project_repository.open_session() as core_db:
            service = merge_service_getter()
            await service.resolve_group(gjo_db, core_db, project_id, trigger=DescriptionMergeTrigger.PIPELINE)
            accumulated = ""
            async for chunk in service.merge_group_stream(
                gjo_db,
                core_db,
                project_id,
                trigger=DescriptionMergeTrigger.PIPELINE,
            ):
                accumulated += chunk
            logger.info(
                "Pipeline merge complete for project_id=%d (%d chars)",
                project_id,
                len(accumulated),
            )
        return {"merged_text": accumulated, "status": "merged"}

    async def _extract_node(state: PipelineState) -> dict[str, Any]:
        """Execute skill-extraction (jobs + skills) for the merged project."""
        from app.fbf.repositories import project_repository

        project_id = state["project_id"]
        async with project_repository.open_session() as gjo_db, project_repository.open_session() as core_db:
            service = extract_service_getter()
            await service.extract_for_master(gjo_db, core_db, project_id)
            logger.info("Pipeline extraction complete for project_id=%d", project_id)
        return {"status": "extracted"}

    graph = StateGraph(PipelineState)

    graph.add_node("merge_description", _merge_node)
    graph.add_node("extract_skills", _extract_node)

    graph.set_entry_point("merge_description")

    graph.add_edge("merge_description", "extract_skills")
    graph.add_edge("extract_skills", END)

    return graph.compile()
