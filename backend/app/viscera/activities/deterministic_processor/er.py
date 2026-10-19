"""ER section: table nodes, FK edges and ``dataModel`` diagram proposals.

Reads ``_pipeline/tables/*.json``, builds base-qualified table nodes (incl.
``columns[]`` for the FE card) and ``references`` FK edges, merges them with
the docker/L3 batches, prunes stale scanner-created ER artefacts and derives
the ER ``dataModel`` diagram proposals.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from datetime import datetime
from pathlib import Path
from typing import Any, cast

import structlog
from ruamel.yaml import YAMLError

from app.viscera.activities.deterministic_processor.diagrams import _diagram_scan_meta
from app.viscera.services.architecture_merge_service import persist_merge_result
from app.viscera.services.architecture_yaml_io_service import _load_yaml_file

logger = structlog.get_logger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────

# Mapping base → tables pipeline file name. Seit der DB-Konsolidierung gibt es
# genau eine Base (``app``, das flache App-Package) – daher genau eine Datei.
# Table nodes are base-qualified (``{base}.{table}``).
_ER_BASE_FILES: dict[str, str] = {
    "app": "app.json",
}

# ER standard diagram: one ``dataModel`` diagram for the single base. Membership
# is carried via ``base`` (the DB node ``db`` only serves navigation via
# ``parent``). ``active_bases`` (bases with a scanned ``tables/*.json``) decides
# which proposals are built — a base without tables yields no proposal, so
# self-cleaning prunes its leftover diagram.
_ER_DIAGRAM_SPECS: list[dict[str, str]] = [
    {
        "base": "app",
        "key": "er-app",
        "name": "ER Modell",
        "description": "ER-Modell der Datenbank gjose (PostgreSQL, base=app)",
    },
]


def _load_object_file(filepath: Path) -> dict[str, Any] | None:
    """Load a YAML object file, tolerating corrupt/missing files.

    Returns ``None`` (after a warning) when the file cannot be loaded or is
    not a YAML mapping.
    """
    try:
        data = _load_yaml_file(str(filepath))
    except (YAMLError, OSError) as exc:
        logger.warning("Cannot load object file %s: %s", filepath, exc)
        return None
    if isinstance(data, dict):
        return cast(dict[str, Any], data)
    return None


def _read_tables(base: str, arch_dir: Path) -> list[dict[str, Any]]:
    """Read ``tables[]`` from ``_pipeline/tables/{filename}`` for a base.

    Returns an empty list (with a warning) when the file is missing, empty,
    or does not contain a ``tables[]`` list. The file name is resolved via
    ``_ER_BASE_FILES``.
    """
    filename = _ER_BASE_FILES.get(base, f"{base}.json")
    filepath = arch_dir / "_pipeline" / "tables" / filename
    if not filepath.is_file():
        logger.warning(
            "DeterministicProcessor: tables file missing base=%s path=%s",
            base,
            filepath,
        )
        return []
    try:
        data = json.loads(filepath.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning(
            "DeterministicProcessor: cannot read tables file base=%s path=%s: %s",
            base,
            filepath,
            exc,
        )
        return []
    tables = data.get("tables") if isinstance(data, dict) else None
    if not isinstance(tables, list):
        logger.warning(
            "DeterministicProcessor: tables file has no tables[] base=%s",
            base,
        )
        return []
    return [table for table in tables if isinstance(table, dict)]


def _build_columns(table: dict[str, Any]) -> list[dict[str, Any]]:
    """Build the ``columns[]`` card payload for a table node.

    Maps each column from ``tables[].columns[]`` to the fields the FE card
    (``SqlTableNode``, Increment 3) renders: name, type (incl. length),
    nullable, pk and whether the column participates in a foreign key.
    Deterministic — the order follows ``tables[].columns[]``.
    """
    fk_columns = {
        fk["column"] for fk in table.get("fks", []) if isinstance(fk, dict) and isinstance(fk.get("column"), str)
    }
    columns: list[dict[str, Any]] = []
    for col in table.get("columns", []):
        if not isinstance(col, dict) or not isinstance(col.get("name"), str):
            continue
        columns.append(
            {
                "name": col["name"],
                "type": col.get("type"),
                "nullable": bool(col.get("nullable", False)),
                "pk": bool(col.get("pk", False)),
                "fk": col["name"] in fk_columns,
            }
        )
    return columns


def _build_table_nodes(
    tables: list[dict[str, Any]],
    base: str,
    now: datetime,
) -> list[dict[str, Any]]:
    """Build table node dicts (``type="table"``) for a base.

    Node IDs are base-qualified (``{base}.{table_name}``) to avoid
    collisions between identically named tables in both bases. Returns the
    nodes sorted by ``id`` for determinism.
    """
    nodes = [
        {
            "id": f"{base}.{table['name']}",
            "name": table["name"],
            "description": "",
            "type": "table",
            "parent": base,
            "domain": table.get("domain"),
            "tags": [],
            "columns": _build_columns(table),
            "scan_meta": {"last_scan_at": now.isoformat()},
        }
        for table in tables
        if isinstance(table.get("name"), str)
    ]
    return sorted(nodes, key=lambda node: node["id"])


def _build_fk_edges(
    tables: list[dict[str, Any]],
    base: str,
    now: datetime,
) -> list[dict[str, Any]]:
    """Build FK edge dicts (``description="references"``) for a base.

    Each ``fks[]`` entry of a table produces one edge from the owning table
    to the referenced table (both base-qualified). Returns the edges sorted
    by ``id`` for determinism.
    """
    edges: list[dict[str, Any]] = []
    for table in tables:
        if not isinstance(table.get("name"), str):
            continue
        from_id = f"{base}.{table['name']}"
        for fk in table.get("fks", []):
            if not isinstance(fk, dict) or not isinstance(fk.get("ref_table"), str):
                continue
            to_id = f"{base}.{fk['ref_table']}"
            edges.append(
                {
                    "id": f"{from_id}__{to_id}",
                    "from": from_id,
                    "to": to_id,
                    "description": "references",
                    "technology": "database",
                    "status": "pending",
                    "scan_meta": {"last_scan_at": now.isoformat()},
                }
            )
    return sorted(edges, key=lambda edge: edge["id"])


def prune_scan_created(
    arch_dir: Path,
    subdir: str,
    fresh_ids: set[str],
    predicate: Callable[[dict[str, Any]], bool],
    *,
    label: str,
) -> None:
    """Delete scanner-created files in ``arch_dir/subdir`` absent from *fresh_ids*.

    Shared by the table/FK-edge pruning (:mod:`er`) and the L3 component/import
    pruning (:mod:`components`). A file is removed only when it matches
    *predicate* **and** carries ``scan_meta`` (scanner-created) **and** its id is
    not in *fresh_ids*. User-created objects (no ``scan_meta``) stay untouched
    (Merge-Matrix principle).

    Args:
        arch_dir: The architecture root holding ``nodes/`` / ``edges/``.
        subdir: Sub-directory to scan (``nodes`` or ``edges``).
        fresh_ids: IDs present in the current scan (kept).
        predicate: Returns ``True`` for files owned by this prune pass.
        label: Human label for the log lines (e.g. ``"table node"``).
    """
    directory = arch_dir / subdir
    if not directory.is_dir():
        return
    for filepath in sorted(directory.glob("*.yml")):
        data = _load_object_file(filepath)
        if data is None or not predicate(data) or data.get("scan_meta") is None:
            continue
        if data.get("id") in fresh_ids:
            continue
        try:
            filepath.unlink()
        except OSError as exc:
            logger.warning("Cannot delete %s file %s: %s", label, filepath, exc)
            continue
        logger.info("DeterministicProcessor: pruned stale %s %s", label, filepath.name)


def _prune_derived_er_data(
    arch_dir: Path,
    fresh_node_ids: set[str],
    fresh_edge_ids: set[str],
) -> None:
    """Prune scanner-created table nodes / FK edges not in the fresh scan set.

    Removes table nodes (``type=="table"``) and ``references`` FK edges
    (``description=="references"``) that carry ``scan_meta`` but are absent
    from the current scan's ID set — no ``scan_missing`` leftovers.
    User-created objects (no ``scan_meta``) stay untouched (Merge-Matrix
    principle). Dto. ``_prune_component_data`` for L3 components/edges.
    """
    prune_scan_created(arch_dir, "nodes", fresh_node_ids, lambda d: d.get("type") == "table", label="table node")
    prune_scan_created(
        arch_dir, "edges", fresh_edge_ids, lambda d: d.get("description") == "references", label="FK edge"
    )


def _existing_table_node_ids(arch_dir: Path) -> set[str]:
    """Return the IDs of existing table nodes (``type="table"``) in ``nodes/``."""
    ids: set[str] = set()
    nodes_dir = arch_dir / "nodes"
    if not nodes_dir.is_dir():
        return ids
    for filepath in sorted(nodes_dir.glob("*.yml")):
        data = _load_object_file(filepath)
        if data and data.get("type") == "table" and isinstance(data.get("id"), str):
            ids.add(data["id"])
    return ids


def _existing_reference_edge_ids(arch_dir: Path) -> set[str]:
    """Return the IDs of existing ``references`` FK edges in ``edges/``."""
    ids: set[str] = set()
    edges_dir = arch_dir / "edges"
    if not edges_dir.is_dir():
        return ids
    for filepath in sorted(edges_dir.glob("*.yml")):
        data = _load_object_file(filepath)
        if data and data.get("description") == "references" and isinstance(data.get("id"), str):
            ids.add(data["id"])
    return ids


def _build_er_diagram_proposals(
    active_bases: list[str],
    now: datetime,
) -> list[dict[str, Any]]:
    """Build ``dataModel`` diagram proposals for bases with scanned tables.

    One ER diagram per base in ``active_bases`` (i.e. bases whose
    ``_pipeline/tables/*.json`` exists and is non-empty): ``type="dataModel"``,
    ``parent="db"`` (navigation via the DB container node) and membership via
    ``base``. Proposals carry ``status: pending`` + ``scan_meta`` — the merge
    matrix (Finding 6.1) decides per diagram whether it is created,
    overwritten, or skipped (approved/user lock). Returns the proposals sorted
    by ``key`` for determinism.
    """
    meta = _diagram_scan_meta(now)
    proposals: list[dict[str, Any]] = []
    for spec in _ER_DIAGRAM_SPECS:
        if spec["base"] not in active_bases:
            continue
        proposals.append(
            {
                "key": spec["key"],
                "name": spec["name"],
                "type": "dataModel",
                "parent": "db",
                "base": spec["base"],
                "description": spec["description"],
                "status": "pending",
                "scan_meta": dict(meta),
                "nodes": {},
            }
        )
    return sorted(proposals, key=lambda proposal: proposal["key"])


def _prune_er_diagrams(arch_dir: Path, active_bases: list[str]) -> int:
    """Delete scanner-created ER diagrams whose base is no longer active.

    Removes ``type=="dataModel"`` diagrams carrying ``scan_meta`` whose
    ``base`` is not in ``active_bases`` (base without a scanned
    ``tables/*.json``) — no ``scan_missing`` leftovers. User-created
    ``dataModel`` diagrams without ``scan_meta`` stay untouched (Merge-Matrix
    principle). Returns the number of pruned diagrams.
    """
    diagrams_dir = arch_dir / "diagrams"
    if not diagrams_dir.is_dir():
        return 0
    pruned = 0
    for filepath in sorted(diagrams_dir.glob("*.yml")):
        data = _load_object_file(filepath)
        if data is None:
            continue
        if data.get("type") != "dataModel" or data.get("scan_meta") is None:
            continue
        if data.get("base") in active_bases:
            continue
        try:
            filepath.unlink()
        except OSError as exc:
            logger.warning("Cannot delete ER diagram %s: %s", filepath, exc)
            continue
        pruned += 1
        logger.info("DeterministicProcessor: pruned ER diagram %s", filepath.name)
    return pruned


def _process_er_section(
    arch_dir: Path,
    now: datetime,
    node_theirs_batch: list[dict[str, Any]],
    edge_theirs_batch: list[dict[str, Any]],
) -> dict[str, Any]:
    """Persist ER table nodes + FK edges together with the other object classes.

    Builds table nodes (``type="table"``, incl. ``columns[]``) and FK edges
    (``description=="references"``) from ``_pipeline/tables/*.json`` for the
    single base. All node/edge classes (docker objects/edges, L3 component
    objects/import edges, ER table nodes/FK edges) share the ``nodes/`` and
    ``edges/`` directories, so they are merged in single
    ``persist_merge_result`` calls — merging them separately would flag the
    other classes as ``scan_missing`` (cross-contamination of the shared merge
    matrix). Afterwards prunes stale scanner-created ER artefacts
    (``_prune_derived_er_data``). Also builds the ``dataModel`` ER standard
    diagram proposal (``er-app``) for the active base and prunes
    diagrams whose base is no longer active (``_prune_er_diagrams``). The ER
    diagram proposals are returned (not persisted here) so they can be merged
    together with the L1/L2/L3 diagram proposals in a single
    ``persist_merge_result(source_dir="diagrams")`` call. Gracefully persists
    only the docker/component objects when no tables files are present.

    Args:
        arch_dir: Resolved ``architecture/`` directory.
        now: Current timestamp for ``scan_meta.last_scan_at``.
        node_theirs_batch: The full ``theirs`` node batch (docker objects + L3
            component objects) to merge together with the ER table nodes.
        edge_theirs_batch: The full ``edges`` batch (docker edges + L3 import
            edges) to merge together with the ER FK edges.

    Returns:
        Dict with freshly-created ``table_nodes``/``fk_edges`` counts, the
        ``er_diagram_proposals`` list, the ``pruned_er_diagrams`` count and
        the ``node_merge_result`` (``None`` when nothing was persisted) for
        the diagram proposal step.
    """
    er_table_nodes: list[dict[str, Any]] = []
    er_fk_edges: list[dict[str, Any]] = []
    active_bases: list[str] = []
    for base in _ER_BASE_FILES:
        tables = _read_tables(base, arch_dir)
        if tables:
            active_bases.append(base)
            er_table_nodes.extend(_build_table_nodes(tables, base, now))
            er_fk_edges.extend(_build_fk_edges(tables, base, now))

    preexisting_table_ids = _existing_table_node_ids(arch_dir)
    preexisting_edge_ids = _existing_reference_edge_ids(arch_dir)

    node_theirs = node_theirs_batch + er_table_nodes
    edge_theirs = edge_theirs_batch + er_fk_edges

    node_merge_result = None
    if node_theirs:
        node_merge_result = persist_merge_result(node_theirs, source_dir="nodes")
        logger.info(
            "DeterministicProcessor: node merge (docker+ER+L3) — updated=%d new=%d missing=%d",
            node_merge_result.objects_updated,
            node_merge_result.objects_new,
            node_merge_result.objects_missing,
        )
    if edge_theirs:
        edge_result = persist_merge_result(edge_theirs, source_dir="edges")
        logger.info(
            "DeterministicProcessor: edge merge (docker+ER+L3) — updated=%d new=%d missing=%d",
            edge_result.objects_updated,
            edge_result.objects_new,
            edge_result.objects_missing,
        )

    fresh_node_ids = {node["id"] for node in er_table_nodes}
    fresh_edge_ids = {edge["id"] for edge in er_fk_edges}
    _prune_derived_er_data(arch_dir, fresh_node_ids, fresh_edge_ids)

    # ── ER standard diagrams (dataModel) ────────────────────────────────
    # One ER diagram for the active base (``parent="db"`` for navigation, base
    # for membership). Proposals are NOT persisted here — they are merged together
    # with the L1/L2/L3 diagram proposals in ``_persist_diagram_proposals`` in
    # a single ``persist_merge_result(source_dir="diagrams")`` call. Merging
    # them separately would cross-contaminate the shared diagram merge matrix
    # (marking the L1/L2 diagrams as ``scan_missing`` and destroying
    # user/approved locks). Self-cleaning prunes diagrams whose base is no
    # longer active.
    er_diagram_proposals = _build_er_diagram_proposals(active_bases, now)
    pruned_er_diagrams = _prune_er_diagrams(arch_dir, active_bases)

    table_nodes_created = len(fresh_node_ids - preexisting_table_ids)
    fk_edges_created = len(fresh_edge_ids - preexisting_edge_ids)
    return {
        "table_nodes": table_nodes_created,
        "fk_edges": fk_edges_created,
        "er_diagram_proposals": er_diagram_proposals,
        "pruned_er_diagrams": pruned_er_diagrams,
        "node_merge_result": node_merge_result,
    }
