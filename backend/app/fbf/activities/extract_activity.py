"""Restate activity for Skill Extraction.

Wraps the ``SkillExtractionService.extract_for_master`` call that runs
after a successful description merge.

IMPORTANT: DB sessions are NOT held across the LLM call.  Each phase
opens and closes its own session so that concurrent ExtractActivity
invocations never exhaust the connection pool.
"""

from __future__ import annotations

from typing import Any

import structlog
from restate import Context, Service

from app.fbf.dependencies.fbf_dependencies import get_skill_extraction_service
from app.shared.db_access.session import AsyncSessionLocal as CoreDB
from app.shared.db_access.session import AsyncSessionLocal as GjoDB

logger = structlog.get_logger(__name__)

extract_activity_service = Service("ExtractActivity")


@extract_activity_service.handler()
async def run(ctx: Context, arg: dict[str, Any]) -> dict[str, Any]:
    """Execute the skill-extraction step for a project.

    Two-phase approach to avoid holding DB connections during the LLM
    call:

    1. **Extract + Persist** — the ``SkillExtractionService`` handles
       its own session lifecycle internally (fetch data, LLM call,
       persist).  We pass session factories instead of open sessions.
    2. **Return** — count the results.

    Args:
        ctx: Restate workflow context.
        arg: Dict with ``project_id`` (int) and ``trigger`` (str) keys.

    Returns:
        Dict with ``ok`` status and ``skills_count``.
    """
    from app.shared.db_access.consumer_label import set_consumer_label
    from app.shared.db_access.trace import trace

    set_consumer_label("restate:extract")
    project_id: int = arg["project_id"]
    trigger: str = arg["trigger"]
    trace("16_extract_activity_start", project_id=project_id, trigger=trigger)

    # Business errors (LLM validation, data issues) MUST NOT propagate as
    # exceptions: Restate would retry the invocation forever, re-running the
    # LLM call on every attempt.  Instead the failure is returned as a plain
    # result dict and the workflow maps it to ``phase="failed"``.
    try:
        async with GjoDB() as gjo_db, CoreDB() as core_db:
            service = get_skill_extraction_service()
            skills = await service.extract_for_master(gjo_db, core_db, project_id, trigger)
    except Exception as exc:
        logger.exception(
            "ExtractActivity: failed for project_id=%d – returning failure result",
            project_id,
        )
        return {"ok": False, "error": str(exc), "project_id": project_id}

    logger.info(
        "ExtractActivity: project_id=%d → %d skills extracted",
        project_id,
        len(skills),
    )
    return {"ok": True, "skills_count": len(skills), "project_id": project_id}
