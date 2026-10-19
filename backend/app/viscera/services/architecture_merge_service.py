"""Merge logic for architecture objects.

Two responsibilities in one cohesive matrix family: the pure three-way merge
matrix (scanned THEIRS vs. curated OURS, Finding 6.1) and its persistence to
the per-object YAML files. Namespace-root pruning keeps pure namespace
directories out of the object graph.
"""

from __future__ import annotations

import os
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

import structlog

from app.viscera.repositories.file.architecture_repository import SOURCE_CODE, ArchitectureStore
from app.viscera.services.architecture_objects_service import _load_objects_from_dir
from app.viscera.services.architecture_yaml_io_service import (
    _atomic_write_yaml,
    _try_replace_object_in_file,
    _walk_yaml_files,
)

if TYPE_CHECKING:
    from app.viscera.schemas.architecture_schemas import MergeResult

logger = structlog.get_logger(__name__)

# ── Namespace Roots (keine Module/Komponenten) ──────────────────────────────

# Pure namespace directories (empty container ``__init__.py``) are NOT real
# modules and must never exist as architecture nodes or edge endpoints.
# The pydeps mapper already excludes them from ``modules[]``; this guard prunes
# stale leftovers (pre-#2477) so they cannot resurface as nodes/dependencies.
_NAMESPACE_NODE_ROOTS = frozenset({"app", "app.core", "app.gjo_se_com"})


def _object_key(obj: dict[str, Any]) -> str | None:
    """Return the merge key of an object: ``id`` (nodes/edges) or ``key`` (diagrams)."""
    obj_key = obj.get("id") or obj.get("key")
    return obj_key if isinstance(obj_key, str) else None


def _is_namespace_root_key(obj_id: str) -> bool:
    """True if an object key is (or references) a pure namespace directory.

    Matches namespace-root node ids (``app``, ``app.core``, ``app.gjo_se_com``)
    and edge ids (``from__to``) where either endpoint is a namespace root.
    Such objects are never real modules/components and are pruned on merge.
    """
    if obj_id in _NAMESPACE_NODE_ROOTS:
        return True
    if "__" in obj_id:
        from_id, to_id = obj_id.split("__", 1)
        return from_id in _NAMESPACE_NODE_ROOTS or to_id in _NAMESPACE_NODE_ROOTS
    return False


def _decide_merge(
    our_obj: dict[str, Any] | None, their_obj: dict[str, Any] | None, now: datetime
) -> tuple[dict[str, Any], str]:
    """Return ``(merged_object, outcome)`` for one id via Matrix 7.1.

    ``outcome`` is one of ``new`` · ``missing`` · ``updated`` · ``skipped``.
    """
    if our_obj is None:
        assert their_obj is not None  # id comes from the union → at least one side exists
        new_obj = dict(their_obj)
        scan_meta = dict(new_obj.get("scan_meta", {}))
        scan_meta["last_scan_at"] = now.isoformat()
        new_obj["scan_meta"] = scan_meta
        new_obj["status"] = "viscera-pending"
        return new_obj, "new"

    if their_obj is None:
        # User-created object (no scan_meta) → preserve as-is, no scan_missing
        if our_obj.get("scan_meta") is None:
            return dict(our_obj), "skipped"
        our_copy = dict(our_obj)
        our_copy["status"] = "viscera-scan_missing"
        return our_copy, "missing"

    our_status = our_obj.get("status")
    # User-created (no scan_meta) or approved (user lock) → skip
    if our_obj.get("scan_meta") is None or our_status == "viscera-approved":
        return dict(our_obj), "skipped"
    # pending / scan_missing → full overwrite with THEIRS, status → pending
    if our_status in ("viscera-pending", "viscera-scan_missing"):
        merged_obj = dict(their_obj)
        scan_meta = dict(merged_obj.get("scan_meta", {}))
        scan_meta["last_scan_at"] = now.isoformat()
        merged_obj["scan_meta"] = scan_meta
        merged_obj["status"] = "viscera-pending"
        return merged_obj, "updated"
    # Any other status (deprecated, rejected, …) → skip
    return dict(our_obj), "skipped"


def merge_into_ist_three_way(ours: dict[str, Any], theirs: list[dict[str, Any]]) -> MergeResult:
    """Binary merge matrix (Finding 7.1) between existing architecture and scan results.

    Pure function — no file I/O, no DB access, fully unit-testable.

    Decision matrix based on OURS status (viscera-* slugs):
    * ``viscera-pending`` → full overwrite with THEIRS data
    * ``viscera-approved`` → skip (user lock), OURS returned unchanged
    * ``viscera-scan_missing`` → overwrite with THEIRS data, status set to ``viscera-pending``
    * no ``scan_meta`` → skip (user-created object)
    * new (only in THEIRS) → status ``viscera-pending``
    * only in OURS → status ``viscera-scan_missing``

    Objects are matched by ``id`` — or by ``key`` for diagrams.

    Args:
        ours: Dict with ``nodes: list[dict]`` (loaded from ``nodes/*.yml``).
        theirs: List of architecture objects from the scan.

    Returns:
        MergeResult with merged objects and statistics. ``skipped_ids``
        contains the keys of objects left untouched (never re-written to disk).
    """
    from app.viscera.schemas.architecture_schemas import MergeResult

    our_objects: list[dict[str, Any]] = ours.get("nodes", [])

    # Build lookup maps by object id (or key for diagrams)
    ours_by_id: dict[str, dict[str, Any]] = {}
    for obj in our_objects:
        obj_id = _object_key(obj)
        if obj_id:
            ours_by_id[obj_id] = obj

    theirs_by_id: dict[str, dict[str, Any]] = {}
    for obj in theirs:
        obj_id = _object_key(obj)
        if obj_id:
            theirs_by_id[obj_id] = obj

    all_ids = set(ours_by_id.keys()) | set(theirs_by_id.keys())

    merged: list[dict[str, Any]] = []
    skipped_ids: set[str] = set()
    objects_updated = 0
    objects_new = 0
    objects_missing = 0

    now = datetime.now(UTC)

    for obj_id in all_ids:
        our_obj = ours_by_id.get(obj_id)
        their_obj = theirs_by_id.get(obj_id)

        # ── Namespace roots → never kept (pruned; stale pre-#2477 leftovers) ─
        if _is_namespace_root_key(obj_id):
            if their_obj is None:
                objects_missing += 1
            continue

        merged_obj, outcome = _decide_merge(our_obj, their_obj, now)
        merged.append(merged_obj)
        if outcome == "new":
            objects_new += 1
        elif outcome == "missing":
            objects_missing += 1
        elif outcome == "updated":
            objects_updated += 1
        else:
            skipped_ids.add(obj_id)

    return MergeResult(
        merged_objects=merged,
        objects_updated=objects_updated,
        objects_new=objects_new,
        objects_missing=objects_missing,
        skipped_ids=skipped_ids,
    )


def persist_merge_result(theirs: list[dict[str, Any]], source_dir: str = "nodes") -> MergeResult:
    """Load existing objects, perform matrix-based merge, write each object as a file.

    Loads all existing object files from ``architecture/{source_dir}/*.yml``,
    calls :func:`merge_into_ist_three_way`, and writes each merged object
    as an individual file ``{source_dir}/{id}.yml`` – preserving comments,
    field order, and quote styles via atomic writes.

    Objects that were skipped by the merge matrix (user-created or approved
    lock) are **not** re-written to disk — their files stay byte-identical.

    Args:
        theirs: List of architecture objects from the scan.
        source_dir: Subdirectory name within ``architecture/`` to read/write.
            Default ``"nodes"`` for system/container objects.
            Use ``"edges"`` for edge objects.
            Use ``"diagrams"`` for diagram objects (matched by ``key``).

    Returns:
        MergeResult with merged objects and statistics.
    """
    arch_dir = ArchitectureStore().root()
    target_dir = arch_dir / source_dir
    target_dir.mkdir(parents=True, exist_ok=True)

    ours = _load_objects_from_dir(target_dir)

    result = merge_into_ist_three_way(ours, theirs)

    for obj in result.merged_objects:
        obj_key = _object_key(obj)
        if obj_key and obj_key not in result.skipped_ids:
            obj_path = target_dir / f"{obj_key}.yml"
            _atomic_write_yaml(str(obj_path), obj)

    # Prune stale namespace-root files (nodes + edges) that are no longer
    # part of the merged result – they must never persist as nodes/dependencies.
    for existing_path in target_dir.glob("*.yml"):
        if _is_namespace_root_key(existing_path.stem):
            existing_path.unlink()
            logger.info("Pruned namespace-root object '%s' (%s)", existing_path.stem, source_dir)

    logger.info(
        "Merge complete (source_dir=%s): updated=%d new=%d missing=%d skipped=%d",
        source_dir,
        result.objects_updated,
        result.objects_new,
        result.objects_missing,
        len(result.skipped_ids),
    )

    return result


def merge_architecture(
    object_id: str,
    merged: dict[str, Any],
    source: str = SOURCE_CODE,
) -> dict[str, Any]:
    """Merge an object into the architecture YAML files.

    Walks **all** YAML files under the source's ``architecture/`` tree, finds
    the object identified by *object_id*, replaces it with the fully *merged*
    object, and writes back atomically.

    Args:
        object_id: Dot-separated ID (e.g. ``"backend"`` or ``"backend.fastapi"``).
        merged: The fully merged object to write.
        source: Architecture source (``code`` or ``golden``). Defaults to
            ``code`` — the live, scanned architecture.

    Returns:
        The merged object as a dictionary.

    Raises:
        ValueError: If the object is not found or validation fails.
        FileNotFoundError: If the architecture directory does not exist.
    """
    arch_root = ArchitectureStore(source).root()
    if not arch_root.is_dir():
        raise FileNotFoundError(f"Architecture directory not found: {arch_root}")

    # Find and replace object in any YAML file (atomic — this is the commit point)
    for full_path in _walk_yaml_files(arch_root):
        if _try_replace_object_in_file(full_path, object_id, merged):
            logger.info("Merged object '%s' into %s", object_id, os.path.relpath(full_path, arch_root))
            return dict(merged)

    raise ValueError(f"Object with id '{object_id}' not found in any YAML file")
