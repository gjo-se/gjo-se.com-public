"""Restate activity – Act 2: Signal Extraction.

Extrahiert strukturierte Signale aus der Projektbeschreibung via
LLM-Task ``endcustomer-extraction``.  Kein DB-Persist – reiner
In-Memory-Output (Signale werden an Act 3 weitergereicht).

Three-phase approach (MergeActivity-Pattern):
1. Fetch – GjoDB: Projekt + Skills laden.
2. LLM – CoreDB: ``execute_task("endcustomer-extraction", ...)``.
3. Return – ``EndcustomerSignalsOut`` als serialisierbares Dict.
"""

from __future__ import annotations

from typing import Any

import structlog
from pydantic import BaseModel
from restate import Context, Service
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project_skill import ProjectSkill
from app.fbf.models.skill import Skill
from app.fbf.repositories import project_repository
from app.shared.db_access.session import AsyncSessionLocal as CoreDB
from app.shared.db_access.session import AsyncSessionLocal as GjoDB
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_task_executor_service
from app.shared.status.models.status import Status, Statusable

logger = structlog.get_logger(__name__)

endcustomer_signal_extraction_service = Service("EndcustomerSignalExtractionActivity")


async def _get_skills_csv(gjo_db: AsyncSession, project_id: int) -> str:
    """Lade confirmed Skills als komma-separierten String.

    Args:
        gjo_db: GjoDB-AsyncSession.
        project_id: Project primary key.

    Returns:
        Komma-separierte Skill-Namen oder leerer String.
    """
    from sqlalchemy import select as sa_select

    confirmed_subq = (
        sa_select(Statusable.statusable_id)
        .join(Status, Status.id == Statusable.status_id)
        .where(
            Statusable.statusable_type == "fbf_skill",
            Status.name == "confirmed",
        )
    )
    stmt = (
        select(Skill.name)
        .select_from(ProjectSkill)
        .join(Skill, Skill.id == ProjectSkill.skill_id)
        .where(
            ProjectSkill.project_id == project_id,
            Skill.id.in_(confirmed_subq),
        )
        .order_by(Skill.name)
    )
    result = await gjo_db.execute(stmt)
    names = [row[0] for row in result.all()]
    return ", ".join(names)


@endcustomer_signal_extraction_service.handler()
async def run(ctx: Context, arg: dict[str, Any]) -> dict[str, Any]:
    """Extract endcustomer signals from project description.

    Args:
        ctx: Restate workflow context.
        arg: Dict with ``project_id`` (int) and ``trigger`` (str).

    Returns:
        Dict with ``project_id`` and ``signals`` (serialized EndcustomerSignalsOut).
    """
    project_id: int = arg["project_id"]
    trigger: str = arg.get("trigger", "pipeline")

    # ── Phase 1: Fetch project data (short-lived GjoDB session) ───────────
    async with GjoDB() as gjo_db:
        master = await project_repository.get_by_id(gjo_db, project_id)
        if master is None:
            raise ValueError(f"Project {project_id} not found")

        slaves = await project_repository.get_slaves(gjo_db, project_id)

        # Build description: Master + all slaves concatenated
        desc_parts: list[str] = []
        if master.description:
            desc_parts.append(master.description)
        desc_parts.extend(slave.description for slave in slaves if slave.description)
        description = "\n\n---\n\n".join(desc_parts)

        title = master.title or ""
        industry = master.industry or ""
        city = master.city or ""
        skills = await _get_skills_csv(gjo_db, project_id)

    # ── Phase 2: LLM call (fresh CoreDB session) ──────────────────────────
    async with CoreDB() as core_db:
        result = await get_task_executor_service().execute_task(
            db=core_db,
            task_key="endcustomer-extraction",
            variables={
                "title": title,
                "description": description,
                "industry": industry,
                "city": city,
                "skills": skills,
            },
            project_id=project_id,
            trigger=trigger,
            phase="Act 2",
        )

    call_log_id: int | None = result.get("call_log_id")

    if not result.get("success"):
        logger.warning(
            "Act 2: extraction failed for project %d: %s",
            project_id,
            result.get("error_type", "unknown"),
        )
        return {"project_id": project_id, "signals": {}, "call_log_id": call_log_id}

    # result["result"] is an EndcustomerSignalsOut Pydantic model instance
    signals: object = result.get("result")
    if signals is None:
        return {"project_id": project_id, "signals": {}, "call_log_id": call_log_id}

    # Serialize to dict via model_dump
    signals_dict: dict[str, Any] = signals.model_dump() if isinstance(signals, BaseModel) else {}

    logger.info(
        "Act 2: project_id=%d signals extracted (company_hints=%d, product_hints=%d)",
        project_id,
        len(signals_dict.get("company_hints", [])),
        len(signals_dict.get("product_hints", [])),
    )
    return {"project_id": project_id, "signals": signals_dict, "call_log_id": call_log_id}
