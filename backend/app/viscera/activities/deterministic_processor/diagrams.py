"""Diagram proposal construction and persistence for the deterministic processor.

Derives L1 ``systemContext``, L2 ``container`` and L3 ``component`` diagram
proposals from merged nodes via ``DIAGRAM_LEVEL_RULES`` and merges them (with
the ER ``dataModel`` proposals) through the three-way merge matrix.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, cast

import structlog

from app.shared.workflow_runtime.infrastructure.restate.activities.diagram_level_rules import (
    DIAGRAM_LEVEL_RULES,
    ParentDiagramLevelRule,
    SingletonDiagramLevelRule,
)
from app.viscera.services.architecture_merge_service import persist_merge_result

logger = structlog.get_logger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────

_DIAGRAM_SCAN_SOURCE = "deterministic_processor"


def _diagram_scan_meta(now: datetime) -> dict[str, Any]:
    """Build ``scan_meta`` for scanner-created diagram proposals (timestamp + source info)."""
    return {
        "last_scan_at": now.isoformat(),
        "sources": {"diagram": _DIAGRAM_SCAN_SOURCE},
    }


def _diagram_key(parent_id: str, level: str) -> str:
    """Build a file-safe diagram key: ``{parent-slug}-{containers|components}``."""
    return f"{parent_id.replace('.', '-')}-{level}"


def _build_diagram_proposals(
    merged_objects: list[dict[str, Any]],
    now: datetime,
) -> list[dict[str, Any]]:
    """Derive diagram proposals from merged nodes via ``DIAGRAM_LEVEL_RULES``.

    * 1 global ``systemContext`` diagram (L1, all systems) — singleton rule
    * 1 ``container`` diagram per system owning containers/data stores (L2)
    * 1 ``component`` diagram per object owning components (L3, flat)

    All proposals carry ``status: pending`` + ``scan_meta`` — the merge
    matrix (Finding 6.1) decides per diagram whether it is created,
    overwritten, or skipped (user/approved lock).
    """
    meta = _diagram_scan_meta(now)
    system_ids = {str(obj["id"]) for obj in merged_objects if obj.get("type") == "system" and obj.get("id")}

    proposals: list[dict[str, Any]] = []
    for rule in DIAGRAM_LEVEL_RULES:
        if rule["singleton"]:
            singleton_rule = cast(SingletonDiagramLevelRule, rule)
            proposals.append(
                {
                    "key": singleton_rule["key"],
                    "name": singleton_rule["name"],
                    "type": singleton_rule["diagram_type"],
                    "description": singleton_rule["description"],
                    "status": "pending",
                    "scan_meta": dict(meta),
                    "nodes": {},
                }
            )
            continue

        parent_rule = cast(ParentDiagramLevelRule, rule)
        parents = {
            str(obj["parent"])
            for obj in merged_objects
            if obj.get("type") in parent_rule["scoped_types"] and obj.get("parent")
        }
        if parent_rule["parents_must_be_systems"]:
            parents &= system_ids

        proposals.extend(
            {
                "key": _diagram_key(parent_id, parent_rule["key_suffix"]),
                "name": f"{parent_id} {parent_rule['name_suffix']}",
                "type": parent_rule["diagram_type"],
                "parent": parent_id,
                "description": parent_rule["description"].format(parent=parent_id),
                "status": "pending",
                "scan_meta": dict(meta),
                "nodes": {},
            }
            for parent_id in sorted(parents)
        )

    return proposals


def _persist_diagram_proposals(
    merge_result: Any,
    now: datetime,
    extra_proposals: list[dict[str, Any]] | None = None,
) -> int:
    """Persist diagram proposals derived from the merged objects.

    Combines the L1/L2/L3 diagram proposals (``_build_diagram_proposals``)
    with the ER ``dataModel`` diagram proposals (``extra_proposals``) into a
    single ``persist_merge_result(source_dir="diagrams")`` call. They must be
    merged together — persisting them in separate calls would cross-contaminate
    the shared merge matrix (each call marks the other class as
    ``scan_missing``), destroying user/approved locks. The merge matrix
    (Finding 6.1) protects approved/user diagrams. Returns the number of newly
    created diagrams.
    """
    diagrams = _build_diagram_proposals(merge_result.merged_objects, now)
    if extra_proposals:
        diagrams.extend(extra_proposals)
    if not diagrams:
        return 0
    diagram_result = persist_merge_result(diagrams, source_dir="diagrams")
    logger.info(
        "DeterministicProcessor: diagram merge — new=%d updated=%d skipped=%d",
        diagram_result.objects_new,
        diagram_result.objects_updated,
        len(diagram_result.skipped_ids),
    )
    return diagram_result.objects_new
