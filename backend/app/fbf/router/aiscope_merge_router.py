"""Aiscope admin endpoints: on-demand description merge stream."""

from collections.abc import AsyncIterator

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.dependencies.fbf_dependencies import (
    get_description_merge_service,
    get_skill_extraction_service,
)
from app.fbf.services.description_merge_service import DescriptionMergeService
from app.shared.db_access.session import AsyncSessionLocal, get_gjo_se_db
from app.shared.db_access.session import AsyncSessionLocal as CoreAsyncSessionLocal
from app.shared.security.dependencies.auth_dependencies import AdminUser

logger = structlog.get_logger(__name__)

router = APIRouter()


async def _run_pipeline_after_merge(project_id: int) -> None:
    """Background task: run the LangGraph pipeline (merge already done).

    Only the ``_extract_skills`` node will execute because ``skip_merge=True``.
    Creates its own DB sessions independent of the request lifecycle.
    Failures are logged but never surface to the caller.
    """
    try:
        from app.fbf.services.pipeline_graph_service import get_graph
        from app.fbf.services.state_service import PipelineState

        state: PipelineState = {
            "project_id": project_id,
            "skip_merge": True,
        }
        graph = get_graph(get_description_merge_service, get_skill_extraction_service)
        await graph.ainvoke(state)
    except Exception:
        logger.exception("Pipeline failed for project_id=%d after merge", project_id)


@router.post(
    "/projects/{project_id}/merge-description",
    summary="Zusammenfassung eines Masters streamen (Admin)",
)
async def merge_project_description(
    project_id: int,
    _: AdminUser,
    background_tasks: BackgroundTasks,
    gjo_db: AsyncSession = Depends(get_gjo_se_db),
    merge_service: DescriptionMergeService = Depends(get_description_merge_service),
) -> StreamingResponse:
    """Streams an on-demand group merge as plain-text chunks.

    Runs the full master + all-slaves merge in a single LLM call and streams
    the generated Markdown chunk by chunk (``text/plain``). On completion the
    result is persisted and ``merged_at`` is stamped (clears the dirty state).

    Resolution (mapping → model → credential → prompt) runs **before** the
    stream starts: a resolution failure yields HTTP 503 with a plain-text
    reason instead of a silently aborting stream. A provider failure **during**
    the stream cannot change the HTTP status; it ends the stream with a
    sentinel chunk ``[[LLM_ERROR:<error_type>:<message>]]``.

    Args:
        project_id: Primary key of the master project.
        _: Admin user (via dependency).
        gjo_db: gjo_se_com database connection (for the up-front existence check).

    Returns:
        StreamingResponse yielding the merged Markdown as it is generated.

    Raises:
        HTTPException 404: Project not found.
        HTTPException 503: LLM configuration/resolution failed before streaming.
    """
    from app.fbf.repositories import project_repository
    from app.shared.llm_gateway.client.client import classify_exception, friendly_error_message

    # Existence check up front → a missing project yields 404, not a broken stream.
    existing = await project_repository.get_by_id(gjo_db, project_id)
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        )

    service = merge_service

    # Resolution pre-check → configuration errors surface as HTTP 503, not a broken stream.
    async with CoreAsyncSessionLocal() as resolve_core_db:
        try:
            await service.resolve_group(gjo_db, resolve_core_db, project_id)
        except Exception as exc:
            logger.warning("Merge resolution failed for project_id=%d: %s", project_id, exc)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=friendly_error_message(exc),
            ) from exc

    async def _generate() -> AsyncIterator[str]:
        """Own DB sessions matching the stream lifetime."""
        async with AsyncSessionLocal() as stream_gjo_db, CoreAsyncSessionLocal() as core_db:
            try:
                async for chunk in service.merge_group_stream(stream_gjo_db, core_db, project_id):
                    yield chunk
            except Exception as exc:
                logger.exception("Merge stream failed for project_id=%d", project_id)
                error_type = classify_exception(exc).value
                message = friendly_error_message(exc).replace("\n", " ")
                yield f"[[LLM_ERROR:{error_type}:{message}]]"

    # Pipeline runs after the merge stream completes (persisted). Merge already
    # happened in the stream — only the extraction node will execute.
    background_tasks.add_task(_run_pipeline_after_merge, project_id)

    return StreamingResponse(_generate(), media_type="text/plain; charset=utf-8")
