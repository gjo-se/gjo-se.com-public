"""Restate activity for LLM-based architecture enrichment.

Reads all object files from ``architecture/nodes/`` (output of
DeterministicProcessor), identifies objects with template descriptions
(source ``"catalog"``), sends them through the Kilo LLM pipeline
(``scan-code-enrich`` task), and writes enriched descriptions back
as individual files.

The former L3 component-summary phase has been **removed** (INC 6, L3 == L4):
component/module descriptions are now generated **on-demand** per node via the
``node_summary_service`` (see ``POST /nodes/{node_id}/summary``) — no scan
auto-generate. Only the L1/L2 ``scan-code-enrich`` phase remains here.

Falls das LLM aus (Circuit Open, NoModel, Timeout), wird die Activity
graceful geskippt – das Modell bleibt valide.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import structlog
from restate import Context, Service

from app.shared.db_access.session import AsyncSessionLocal as CoreDB
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_task_executor_service
from app.viscera.repositories.file.architecture_repository import resolve_architecture_dir
from app.viscera.services.architecture_objects_service import _load_objects_from_dir
from app.viscera.services.architecture_yaml_io_service import _atomic_write_yaml

logger = structlog.get_logger(__name__)

llm_enrichment_service = Service("LlmEnrichment")

_MAX_OBJECTS_PER_BATCH = 20
"""Maximum number of objects sent to the LLM in a single enrichment batch."""


def _filter_template_objects(objects: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Find objects whose description was set by the DeterministicProcessor (source ``"catalog"``).

    Only objects with template descriptions (not user-edited or parser-derived)
    are candidates for LLM enrichment.
    """
    candidates: list[dict[str, Any]] = []
    for obj in objects:
        scan_meta = obj.get("scan_meta")
        if not isinstance(scan_meta, dict):
            continue
        sources = scan_meta.get("sources")
        if not isinstance(sources, dict):
            continue
        if sources.get("description") != "catalog":
            continue
        description = obj.get("description")
        if not isinstance(description, str) or not description.strip():
            continue
        candidates.append(obj)
    return candidates


def _build_llm_input(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Build minimal JSON payload for the LLM – only id + enrichable fields."""
    result: list[dict[str, Any]] = []
    for obj in candidates:
        entry: dict[str, Any] = {"id": obj.get("id")}
        if obj.get("description"):
            entry["description"] = obj["description"]
        if "edge_label" in obj and obj.get("edge_label"):
            entry["edge_label"] = obj["edge_label"]
        result.append(entry)
    return result


def _apply_enriched(candidates: list[dict[str, Any]], enriched_output: Any) -> tuple[int, int]:
    """Apply enriched descriptions and labels from the LLM output to candidate objects.

    Mutates *candidates* in place.

    Returns:
        Tuple of (descriptions_enriched, labels_enriched).
    """
    enriched_objects: list[dict[str, Any]] = []
    if isinstance(enriched_output, dict):
        enriched_objects = enriched_output.get("objects", [])
    elif hasattr(enriched_output, "objects"):
        enriched_objects = [obj.model_dump() for obj in enriched_output.objects]

    enriched_by_id: dict[str, dict[str, Any]] = {obj["id"]: obj for obj in enriched_objects if "id" in obj}

    descriptions_enriched = 0
    labels_enriched = 0

    for obj in candidates:
        obj_id = obj.get("id")
        if obj_id not in enriched_by_id:
            continue
        enriched = enriched_by_id[obj_id]

        # Update description if LLM provided a better one
        new_desc = enriched.get("description")
        if isinstance(new_desc, str) and new_desc.strip() and new_desc != obj.get("description"):
            obj["description"] = new_desc
            # Mark source as "llm" (enriched, not template)
            scan_meta = obj.setdefault("scan_meta", {})
            sources = scan_meta.setdefault("sources", {})
            sources["description"] = "llm"
            descriptions_enriched += 1

        # Update edge_label if LLM provided a better one
        new_label = enriched.get("edge_label")
        if isinstance(new_label, str) and new_label.strip() and new_label != obj.get("edge_label"):
            obj["edge_label"] = new_label
            scan_meta = obj.setdefault("scan_meta", {})
            sources = scan_meta.setdefault("sources", {})
            sources["edge_label"] = "llm"
            labels_enriched += 1

    return descriptions_enriched, labels_enriched


async def _run_l1_enrichment(objects: list[dict[str, Any]], nodes_dir: Path, trigger: str) -> dict[str, Any]:
    """Run the L1/L2 template-description enrichment phase.

    Filters objects with template descriptions (source ``"catalog"``) and
    enriches them via the ``scan-code-enrich`` task. An LLM failure is a
    graceful skip (``skipped=True``).

    Args:
        objects: All loaded architecture objects.
        nodes_dir: Resolved ``nodes/`` directory.
        trigger: Trigger label forwarded to the LLM pipeline.

    Returns:
        Dict with ``ok``, ``error``, ``skipped``, ``reason``,
        ``descriptions_enriched`` and ``labels_enriched``.
    """
    result: dict[str, Any] = {
        "ok": True,
        "error": None,
        "skipped": False,
        "reason": None,
        "descriptions_enriched": 0,
        "labels_enriched": 0,
    }

    candidates = _filter_template_objects(objects)
    if not candidates:
        logger.info("LlmEnrichment: no objects with template descriptions – L1 enrichment skipped")
        return result

    if len(candidates) > _MAX_OBJECTS_PER_BATCH:
        logger.warning(
            "LlmEnrichment: %d candidates exceed batch limit of %d – truncating",
            len(candidates),
            _MAX_OBJECTS_PER_BATCH,
        )
        candidates = candidates[:_MAX_OBJECTS_PER_BATCH]

    logger.info("LlmEnrichment: enriching %d objects with template descriptions", len(candidates))

    llm_input = _build_llm_input(candidates)
    variables = {"architecture_objects": json.dumps(llm_input, ensure_ascii=False)}

    try:
        async with CoreDB() as core_db:
            llm_result = await get_task_executor_service().execute_task(
                db=core_db,
                task_key="scan-code-enrich",
                variables=variables,
                trigger=trigger,
            )
    except Exception as exc:
        logger.exception("LlmEnrichment skipped: LLM call failed")
        result["skipped"] = True
        result["reason"] = str(exc)
        return result

    if not llm_result.get("success"):
        error_type = llm_result.get("error_type", "unknown")
        logger.warning("LlmEnrichment skipped: LLM unavailable (error_type=%s)", error_type)
        result["skipped"] = True
        result["reason"] = error_type
        return result

    llm_output = llm_result.get("result")
    if llm_output is None:
        logger.warning("LlmEnrichment skipped: LLM returned no result")
        result["skipped"] = True
        result["reason"] = "no_result"
        return result

    try:
        result["descriptions_enriched"], result["labels_enriched"] = _apply_enriched(candidates, llm_output)
    except Exception as exc:
        logger.exception("LlmEnrichment: failed to apply enriched values")
        result["skipped"] = True
        result["reason"] = f"apply_failed: {exc}"
        return result

    write_errors = 0
    for obj in candidates:
        obj_id = obj.get("id")
        if not obj_id:
            continue
        obj_path = nodes_dir / f"{obj_id}.yml"
        try:
            _atomic_write_yaml(str(obj_path), obj)
        except Exception:
            logger.exception("LlmEnrichment: failed to write %s", obj_path)
            write_errors += 1

    if write_errors:
        result["ok"] = False
        result["error"] = f"Failed to write {write_errors} object files"
    else:
        logger.info(
            "LlmEnrichment: enriched descriptions=%d labels=%d for %d objects",
            result["descriptions_enriched"],
            result["labels_enriched"],
            len(candidates),
        )

    return result


@llm_enrichment_service.handler()
async def run(ctx: Context, arg: dict[str, Any]) -> dict[str, Any]:
    """Enrich architecture object descriptions via LLM.

    Runs the **L1/L2** phase only: objects with template descriptions
    (source ``"catalog"``) are sent through the ``scan-code-enrich`` task.

    L3/L4 component/module descriptions are no longer generated here – they
    are produced on-demand per node via ``node_summary_service`` (INC 6,
    L3 == L4, see ``POST /nodes/{node_id}/summary``).

    If the LLM is unavailable for any reason (NoModel, Circuit Open,
    Timeout), the phase is graceful-skipped without modifying the model.

    Args:
        ctx: Restate workflow context.
        arg: Dict with optional ``trigger`` key (default ``"pipeline"``).

    Returns:
        Dict with ``ok``, ``skipped``, ``descriptions_enriched``,
        ``labels_enriched`` and optional ``reason``.
    """
    from app.shared.db_access.consumer_label import set_consumer_label

    set_consumer_label("restate:llm-enrichment")
    trigger: str = arg.get("trigger", "pipeline")

    arch_root = resolve_architecture_dir()
    nodes_dir = arch_root / "nodes"

    objects: list[dict[str, Any]] = []
    if nodes_dir.is_dir():
        objects = _load_objects_from_dir(nodes_dir).get("nodes", [])
    else:
        logger.info("LlmEnrichment: nodes/ directory not found – L1 enrichment skipped")

    l1 = await _run_l1_enrichment(objects, nodes_dir, trigger)

    return {
        "ok": bool(l1["ok"]),
        "error": l1["error"],
        "skipped": l1["skipped"],
        "reason": l1["reason"],
        "descriptions_enriched": l1["descriptions_enriched"],
        "labels_enriched": l1["labels_enriched"],
    }
