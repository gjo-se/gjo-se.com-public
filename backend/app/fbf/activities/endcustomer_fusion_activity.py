"""Restate activity – Act 8: Candidate Fusion.

Sendet alle bewerteten Candidates an den LLM-Task ``endcustomer-fusion``,
der Dubletten merged und die finale Confidence setzt.  Nach der Fusion:
- Gleiche Firma aus Brave+Tavily → ``source="both"``, andere ``rejected``.
- Nicht im Fusions-Result enthaltene Candidates → ``status="rejected"``.

Three-phase approach (MergeActivity-Pattern):
1. Fetch – GjoDB: Lade alle bewerteten Candidates.
2. LLM – CoreDB: ``execute_task("endcustomer-fusion", ...)``.
3. Persist – GjoDB: Dubletten mergen, Rejects markieren.
"""

from __future__ import annotations

import json
from typing import Any

import structlog
from restate import Context, Service
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.models.project_endcustomer_candidate import (
    ProjectEndcustomerCandidate,
)
from app.fbf.repositories import project_endcustomer_candidate_repository as repo
from app.shared.db_access.session import AsyncSessionLocal as CoreDB
from app.shared.db_access.session import AsyncSessionLocal as GjoDB
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_task_executor_service
from app.shared.status.repositories import statusable_repository

logger = structlog.get_logger(__name__)

endcustomer_fusion_activity_service = Service("EndcustomerFusionActivity")


def _build_web_candidates(to_fuse: list[ProjectEndcustomerCandidate]) -> str:
    """Serialise the pending candidates to the ``web_candidates`` JSON payload for the LLM."""
    web_candidates_list: list[dict[str, object]] = [
        {
            "id": c.id,
            "company_name": c.company_name,
            "website": c.website,
            "career_page_url": c.career_page_url,
            "confidence": c.confidence,
            "source": c.source,
            "reasoning": c.reasoning or "",
        }
        for c in to_fuse
    ]
    return json.dumps(web_candidates_list)


def _build_company_to_ids(to_fuse: list[ProjectEndcustomerCandidate]) -> dict[str, list[int]]:
    """Map lowercased company name → list of original candidate ids."""
    company_to_ids: dict[str, list[int]] = {}
    for c in to_fuse:
        key = c.company_name.strip().lower()
        company_to_ids.setdefault(key, []).append(c.id)
    return company_to_ids


def _build_fusion_map(fused_candidates: list[object]) -> dict[str, dict[str, object]]:
    """Map lowercased company name → fused candidate data from the LLM result."""
    fusion_map: dict[str, dict[str, object]] = {}
    for fc in fused_candidates:
        fc_name = str(getattr(fc, "company_name", "")).strip().lower()
        fusion_map[fc_name] = {
            "company_name": getattr(fc, "company_name", ""),
            "website": getattr(fc, "website", None),
            "career_page_url": getattr(fc, "career_page_url", None),
            "confidence": getattr(fc, "confidence", 0.0),
            "source": getattr(fc, "source", "brave"),
            "reasoning": getattr(fc, "reasoning", ""),
        }
    return fusion_map


async def _merge_company_group(
    gjo_db: AsyncSession,
    company_key: str,
    candidate_ids: list[int],
    fusion_map: dict[str, dict[str, object]],
    to_fuse: list[ProjectEndcustomerCandidate],
    matched_ids: set[int],
) -> int:
    """Merge one company group; reject unmatched/duplicate candidates. Returns 1 if fused."""
    fused_data = fusion_map.get(company_key)
    if fused_data is None:
        for cid in candidate_ids:
            await repo.update_status(gjo_db, cid, "rejected")
        return 0

    keeper_id = candidate_ids[0]
    matched_ids.add(keeper_id)

    sources: set[str] = set()
    for c in to_fuse:
        if c.id in candidate_ids:
            sources.add(c.source)
    merged_source = "both" if len(sources) > 1 else sources.pop()

    await repo.update_fields(
        gjo_db,
        keeper_id,
        confidence=fused_data["confidence"],
        reasoning=fused_data["reasoning"],
        source=merged_source,
    )
    for cid in candidate_ids[1:]:
        await repo.update_status(gjo_db, cid, "rejected")
    return 1


async def _reject_unmatched(
    gjo_db: AsyncSession,
    to_fuse: list[ProjectEndcustomerCandidate],
    matched_ids: set[int],
    fusion_map: dict[str, dict[str, object]],
) -> None:
    """Reject every candidate not matched to any fusion group."""
    for c in to_fuse:
        if c.id not in matched_ids and c.company_name.strip().lower() not in fusion_map:
            await repo.update_status(gjo_db, c.id, "rejected")


@endcustomer_fusion_activity_service.handler()
async def run(ctx: Context, arg: dict[str, Any]) -> dict[str, Any]:
    """Fusioniere bewertete Candidates und merge Dubletten.

    Args:
        ctx: Restate workflow context.
        arg: Dict with ``project_id`` (int) and optional ``trigger`` (str).

    Returns:
        Dict with ``project_id``, ``fused`` (int), ``rejected`` (int).
    """
    project_id: int = arg["project_id"]
    trigger: str = arg.get("trigger", "pipeline")

    # ── Phase 1: Fetch candidates (short-lived GjoDB session) ─────────────
    async with GjoDB() as gjo_db:
        candidates = await repo.get_by_project(gjo_db, project_id)

    # Filter: candidates with status=pending (confidence is NOT NULL by schema)
    to_fuse: list[ProjectEndcustomerCandidate] = []
    for c in candidates:
        entry = await statusable_repository.get_status(gjo_db, "project_endcustomer_candidate", c.id)
        if entry is not None and entry.status.name == "pending":
            to_fuse.append(c)

    if not to_fuse:
        logger.info("Act 8: no pending candidates with confidence for project %d", project_id)
        return {"project_id": project_id, "fused": 0, "rejected": 0}

    # Build web_candidates JSON for LLM
    web_candidates_json = _build_web_candidates(to_fuse)

    # ── Phase 2: LLM fusion (CoreDB) ──────────────────────────────────────
    async with CoreDB() as core_db:
        result = await get_task_executor_service().execute_task(
            db=core_db,
            task_key="endcustomer-fusion",
            variables={"web_candidates": web_candidates_json},
            project_id=project_id,
            trigger=trigger,
        )

    if not result.get("success"):
        logger.warning(
            "Act 8: fusion failed for project %d: %s",
            project_id,
            result.get("error_type", "unknown"),
        )
        return {"project_id": project_id, "fused": 0, "rejected": 0}

    # result["result"] is an EndcustomerFusionResultOut Pydantic model instance
    fusion_result: object = result.get("result")
    if fusion_result is None:
        logger.warning("Act 8: fusion result is None for project %d", project_id)
        return {"project_id": project_id, "fused": 0, "rejected": 0}

    fused_candidates: list[object] = getattr(fusion_result, "candidates", []) or []

    if not fused_candidates:
        logger.info("Act 8: fusion returned empty candidate list for project %d", project_id)
        return {"project_id": project_id, "fused": 0, "rejected": 0}

    # Build a lookup: company_name (lowercased) → list of original candidate IDs
    company_to_ids = _build_company_to_ids(to_fuse)

    # Build fusion map: company_name → fused candidate data
    fusion_map = _build_fusion_map(fused_candidates)

    # ── Phase 3: Persist (GjoDB) – merge duplicates, reject unmatched ─────
    matched_ids: set[int] = set()
    fused: int = 0

    async with GjoDB() as gjo_db:
        for company_key, candidate_ids in company_to_ids.items():
            fused += await _merge_company_group(gjo_db, company_key, candidate_ids, fusion_map, to_fuse, matched_ids)

    # Reject candidates not in any fusion group
    async with GjoDB() as gjo_db:
        await _reject_unmatched(gjo_db, to_fuse, matched_ids, fusion_map)

    logger.info(
        "Act 8: project_id=%d fused=%d rejected=%d",
        project_id,
        fused,
        len(to_fuse) - len(matched_ids),
    )
    return {
        "project_id": project_id,
        "fused": fused,
        "rejected": len(to_fuse) - len(matched_ids),
    }
