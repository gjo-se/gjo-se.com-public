"""FastAPI router for LLM task evaluation (admin-only).

Routes:
    GET    /admin/core/llm/eval-runs/{task}          – List eval runs for a task
    GET    /admin/core/llm/eval-runs/judge-info     – Current Judge model from LangFuse
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.config.config import settings
from app.shared.db_access.session import get_db
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_eval_run_service
from app.shared.llm_gateway.schemas.eval_run_schemas import EvalRunResponse
from app.shared.llm_gateway.services.eval_run_service import EvalRunService
from app.shared.security.dependencies.auth_dependencies import AdminUser

logger = structlog.get_logger(__name__)

eval_runs_router = APIRouter(prefix="/eval-runs", tags=["llm · eval-runs · admin"])


# ── Judge Info (SSOT: LangFuse) ────────────────────────────────────────────


class JudgeInfoResponse(BaseModel):
    """Current Judge model as configured in LangFuse, mapped to our DB."""

    provider: str = Field(..., description="Provider name (e.g. Xiaomi)")
    model_name: str = Field(..., description="Model name in LangFuse (e.g. mimo-v2.5-pro)")
    internal_model_id: int | None = Field(default=None, description="Matching llm_model.id, if any")
    internal_display_name: str | None = Field(default=None, description="Matching model display name")
    configured: bool = Field(..., description="True if a judge is configured in LangFuse")

    model_config = {"from_attributes": True}


@eval_runs_router.get(
    "/judge-info",
    response_model=JudgeInfoResponse,
)
async def get_judge_info(
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> JudgeInfoResponse:
    """Return the currently configured Judge model from LangFuse.

    Reads the default LLM model configured for the gjo-se-llm project in
    LangFuse and maps it to our internal ``llm_model`` table for the
    Self-Judge-Guard and FE display.
    """
    project_id = settings.LANGFUSE_PROJECT_ID

    try:
        import asyncpg

        conn = await asyncpg.connect(
            "postgresql://langfuse:langfuse@host.docker.internal:5433/langfuse",  # pragma: allowlist secret
        )
        try:
            row = await conn.fetchrow(
                """SELECT dm.model, dm.provider, et.name
                   FROM default_llm_models dm
                   LEFT JOIN eval_templates et ON et.project_id = dm.project_id
                       AND et.type = 'LLM_AS_JUDGE'
                       AND et.provider = dm.provider
                   WHERE dm.project_id = $1
                   LIMIT 1""",
                project_id,
            )
        finally:
            await conn.close()
    except Exception:
        logger.exception("judge-info: LangFuse DB query failed")
        return JudgeInfoResponse(provider="", model_name="", configured=False)

    if row is None:
        return JudgeInfoResponse(
            provider="",
            model_name="",
            configured=False,
        )

    lf_model_name: str = row["model"]
    lf_provider: str = row["provider"]

    # Map to our internal llm_model by matching model identifier / display_name
    internal_model_id: int | None = None
    internal_display_name: str | None = None
    try:
        stmt = text("""
            SELECT m.id, m.display_name
            FROM shared_model m
            JOIN shared_provider p ON p.id = m.provider_id
            WHERE m.model_identifier = :name OR m.display_name ILIKE :pattern
            LIMIT 1
        """)
        result = await db.execute(
            stmt,
            {
                "name": lf_model_name,
                "pattern": f"%{lf_model_name}%",
            },
        )
        internal = result.fetchone()
        if internal:
            internal_model_id = int(internal[0])
            internal_display_name = str(internal[1])
    except Exception:
        logger.exception("judge-info: internal model mapping failed")

    return JudgeInfoResponse(
        provider=lf_provider,
        model_name=lf_model_name,
        internal_model_id=internal_model_id,
        internal_display_name=internal_display_name,
        configured=True,
    )


# ── Eval Runs ──────────────────────────────────────────────────────────────
# Declared AFTER the static ``/judge-info`` route so the dynamic ``/{task}``
# segment does not shadow it (FastAPI matches routes in declaration order).


@eval_runs_router.get(
    "/{task}",
    response_model=list[EvalRunResponse],
)
async def list_eval_runs(
    task: str,
    _admin: AdminUser,
    limit: int = Query(50, ge=1, le=200, description="Maximale Anzahl Ergebnisse"),
    service: EvalRunService = Depends(get_eval_run_service),
) -> list[EvalRunResponse]:
    """Return evaluation runs for a given task, newest first."""
    runs = await service.list_by_task(task, limit=limit)
    return [EvalRunResponse.model_validate(r) for r in runs]
