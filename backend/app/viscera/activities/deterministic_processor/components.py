"""L3 component objects and cross-component import edges.

Aggregates the canonical ``backend.json`` ``modules[]`` (PydepsActivity output)
into one ``component`` object per distinct ``top_level`` plus their
``imports`` edges, and prunes stale scanner-created L3 artefacts.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

import structlog

from app.viscera.activities.deterministic_processor.er import _load_object_file

logger = structlog.get_logger(__name__)


def _load_backend_modules(arch_dir: Path) -> list[dict[str, Any]]:
    """Read the canonical ``backend.modules[]`` list from ``imports/backend.json``.

    ``backend.json`` is written by PydepsActivity earlier in the same workflow
    (see ``scan_code_workflow``). Returns an empty list (with a warning) when
    the file is missing or has no ``backend.modules[]`` section.
    """
    imports_path = arch_dir / "_pipeline" / "imports" / "backend.json"
    if not imports_path.is_file():
        logger.warning("DeterministicProcessor: imports/backend.json not found")
        return []
    try:
        data = json.loads(imports_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning(
            "DeterministicProcessor: cannot read imports/backend.json: %s",
            exc,
        )
        return []
    modules = (data.get("backend") or {}).get("modules", [])
    if not isinstance(modules, list):
        logger.warning("DeterministicProcessor: backend.json has no modules[] section")
        return []
    return [m for m in modules if isinstance(m, dict)]


def _build_component_objects(
    modules: list[dict[str, Any]],
    now: datetime,
) -> list[dict[str, Any]]:
    """Aggregate backend modules into L3 ``component`` objects keyed by ``top_level``.

    Groups the canonical ``modules[]`` entries deterministically by their
    ``top_level`` field (the level-3 Component key), producing exactly one
    object per distinct component. ``id``/``name`` equal the full feature path
    (e.g. ``app.shared.llm_gateway``), unique across the flat ``app`` package.
    Returns the objects sorted by ``id`` for byte-identical runs.
    """
    top_levels = sorted({str(m["top_level"]) for m in modules if m.get("top_level")})
    return [
        {
            "id": top_level,
            "name": top_level,
            "description": "",
            "type": "component",
            "parent": "backend",
            "external": False,
            "tags": [],
            "scan_meta": {"last_scan_at": now.isoformat()},
        }
        for top_level in top_levels
    ]


def _build_component_edges(
    modules: list[dict[str, Any]],
    now: datetime,
) -> list[dict[str, Any]]:
    """Aggregate module-level imports into cross-component ``imports`` edges.

    Each module-level edge ``X → Y`` is lifted to the component level as
    ``top_level(X) → top_level(Y)``. Many module edges between the same two
    components collapse into a single relationship (set semantics). Only
    internal ``app.*`` imports with a known component key are emitted;
    intra-component imports (identical ``top_level`` on both sides) are
    discarded. Returns the edges sorted by ``id`` for determinism.
    """
    top_level_by_name = {str(m["name"]): str(m["top_level"]) for m in modules if m.get("name")}
    pairs: set[tuple[str, str]] = set()
    for module in modules:
        from_top = str(module.get("top_level", ""))
        if not from_top:
            continue
        for imp in module.get("imports", []):
            imp_name = str(imp)
            if not imp_name.startswith("app."):
                continue
            to_top = top_level_by_name.get(imp_name)
            if to_top is None or from_top == to_top:
                continue
            pairs.add((from_top, to_top))

    return [
        {
            "id": f"{from_top}__{to_top}",
            "from": from_top,
            "to": to_top,
            "description": "imports",
            "technology": "python",
            "status": "pending",
            "scan_meta": {"last_scan_at": now.isoformat()},
        }
        for from_top, to_top in sorted(pairs)
    ]


def _prune_component_data(
    arch_dir: Path,
    fresh_node_ids: set[str],
    fresh_edge_ids: set[str],
) -> None:
    """Prune stale scanner-created L3 component nodes / import edges.

    Removes component nodes (``type=="component"``) and ``imports`` edges
    (``description=="imports"``, ``technology=="python"``) that carry
    ``scan_meta`` but are absent from the current scan's fresh-ID set — no
    ``scan_missing`` leftovers. User-created objects (no ``scan_meta``) stay
    untouched (Merge-Matrix principle).
    """
    nodes_dir = arch_dir / "nodes"
    if nodes_dir.is_dir():
        for filepath in sorted(nodes_dir.glob("*.yml")):
            data = _load_object_file(filepath)
            if data is None:
                continue
            if data.get("type") != "component" or data.get("scan_meta") is None:
                continue
            if data.get("id") in fresh_node_ids:
                continue
            try:
                filepath.unlink()
            except OSError as exc:
                logger.warning("Cannot delete component node %s: %s", filepath, exc)
                continue
            logger.info(
                "DeterministicProcessor: pruned stale component node %s",
                filepath.name,
            )

    edges_dir = arch_dir / "edges"
    if edges_dir.is_dir():
        for filepath in sorted(edges_dir.glob("*.yml")):
            data = _load_object_file(filepath)
            if data is None:
                continue
            if (
                data.get("description") != "imports"
                or data.get("technology") != "python"
                or data.get("scan_meta") is None
            ):
                continue
            if data.get("id") in fresh_edge_ids:
                continue
            try:
                filepath.unlink()
            except OSError as exc:
                logger.warning("Cannot delete import edge %s: %s", filepath, exc)
                continue
            logger.info(
                "DeterministicProcessor: pruned stale import edge %s",
                filepath.name,
            )


def _extend_l3_batches(
    arch_dir: Path,
    now: datetime,
    theirs: list[dict[str, Any]],
    edges: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Build L3 component objects + import edges and append them to the shared batches."""
    modules = _load_backend_modules(arch_dir)
    component_nodes = _build_component_objects(modules, now)
    component_edges = _build_component_edges(modules, now)
    theirs.extend(component_nodes)
    edges.extend(component_edges)
    return component_nodes, component_edges
