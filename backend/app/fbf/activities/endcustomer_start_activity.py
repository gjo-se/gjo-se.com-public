"""Restate activity – Act 1: Start.

Setzt ``project.endcustomer_researched_at`` auf ``datetime.now(UTC)``
und markiert damit den Beginn eines Recherche-Durchlaufs.

Einfache ein-Phasen-Activity (nur GjoDB – kein LLM/HTTP-Call).
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import structlog
from restate import Context, Service

from app.fbf.repositories import project_repository
from app.shared.db_access.session import AsyncSessionLocal as GjoDB

logger = structlog.get_logger(__name__)

endcustomer_start_service = Service("EndcustomerStartActivity")


@endcustomer_start_service.handler()
async def run(ctx: Context, arg: dict[str, Any]) -> dict[str, Any]:
    """Set ``endcustomer_researched_at`` timestamp on the project.

    Args:
        ctx: Restate workflow context.
        arg: Dict with ``project_id`` (int).

    Returns:
        Dict with ``project_id`` and ``started_at`` (ISO format).
    """
    project_id: int = arg["project_id"]
    now = datetime.now(UTC)
    iso = now.isoformat()

    async with GjoDB() as gjo_db:
        project = await project_repository.get_by_id(gjo_db, project_id)
        if project is None:
            raise ValueError(f"Project {project_id} not found")

        project.endcustomer_researched_at = now
        await gjo_db.commit()

    logger.info("Act 1: project_id=%d started_at=%s", project_id, iso)
    return {"project_id": project_id, "started_at": iso}
