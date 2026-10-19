"""Unit-Tests für die Merge-Logik (architecture_merge_service).

Deckt die Matrix 7.1 (pending überschreiben, approved skip, scan_missing
überschreiben+pending, User-Objekte skip, new, scan_missing), die reinen
Key-/Namespace-Helfer und den ``persist_merge_result``-Datei-Roundtrip ab.
Kein Netz, keine DB.
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

from app.viscera.schemas.architecture_schemas import MergeResult
from app.viscera.services import architecture_merge_service
from app.viscera.services.architecture_merge_service import (
    _decide_merge,
    _is_namespace_root_key,
    _object_key,
    merge_into_ist_three_way,
    persist_merge_result,
)

pytestmark = pytest.mark.unit

_NOW = datetime(2026, 1, 1, tzinfo=UTC)


# ── Helpers ────────────────────────────────────────────────────────────────


def _make_ours(objects: list[dict]) -> dict:
    """Build OURS structure from an object list (key: ``nodes`` matching production code)."""
    return {"nodes": objects}


def _make_theirs_object(
    obj_id: str,
    *,
    name: str = "Test Object",
    description: str = "A test description",
    status: str = "pending",
) -> dict:
    """Build a THEIRS scan object with scan_meta (last_scan_at)."""
    return {
        "id": obj_id,
        "name": name,
        "description": description,
        "status": status,
        "scan_meta": {"last_scan_at": "2024-01-01T00:00:00+00:00"},
    }


def _make_ours_scanned_object(
    obj_id: str,
    *,
    name: str = "Test Object",
    description: str = "A test description",
    status: str = "pending",
    last_scan_at: str | None = "2024-01-01T00:00:00+00:00",
) -> dict:
    """Build an OURS object with scan_meta (i.e. previously imported from a scan)."""
    meta: dict = {}
    if last_scan_at is not None:
        meta["last_scan_at"] = last_scan_at
    return {
        "id": obj_id,
        "name": name,
        "description": description,
        "status": status,
        "scan_meta": meta if meta else {},
    }


def _make_ours_user_object(
    obj_id: str,
    *,
    name: str = "User Object",
    description: str = "Manually created",
    status: str = "pending",
) -> dict:
    """Build an OURS user-created object (scan_meta is None)."""
    return {
        "id": obj_id,
        "name": name,
        "description": description,
        "status": status,
        "scan_meta": None,
    }


def _find_merged(result: MergeResult, obj_id: str) -> dict:
    """Find a merged object by id in the result."""
    for obj in result.merged_objects:
        if obj.get("id") == obj_id:
            return obj
    raise AssertionError(f"Object '{obj_id}' not found in merged_objects")


def _patch_root(monkeypatch: pytest.MonkeyPatch, root: Path) -> None:
    """Point ArchitectureStore().root() at the given temporary directory."""
    monkeypatch.setattr(
        architecture_merge_service,
        "ArchitectureStore",
        lambda _source=architecture_merge_service.SOURCE_CODE: SimpleNamespace(root=lambda: root),
    )


# ── merge_into_ist_three_way matrix ─────────────────────────────────────────


def test_approved_node_never_overwritten() -> None:
    """OURS status=approved → NIE vom Scan verändert, objects_updated=0."""
    ours = _make_ours(
        [
            _make_ours_scanned_object("sys1", name="Approved Name", description="Approved Desc", status="approved"),
        ]
    )
    theirs = [
        _make_theirs_object("sys1", name="Scan Name", description="Scan Desc", status="pending"),
    ]

    result = merge_into_ist_three_way(ours, theirs)

    assert result.objects_updated == 0
    assert result.objects_new == 0
    assert result.objects_missing == 0

    merged = _find_merged(result, "sys1")
    assert merged["name"] == "Approved Name"
    assert merged["description"] == "Approved Desc"
    assert merged["status"] == "approved"


def test_user_object_never_overwritten() -> None:
    """OURS-Objekt ohne scan_meta (User-Objekt) → NIE vom Scan überschreiben."""
    ours = _make_ours(
        [
            _make_ours_user_object("sys1", name="User Name", description="User Desc", status="pending"),
        ]
    )
    theirs = [
        _make_theirs_object("sys1", name="Scan Name", description="Scan Desc"),
    ]

    result = merge_into_ist_three_way(ours, theirs)

    assert result.objects_updated == 0
    assert result.objects_new == 0
    assert result.objects_missing == 0

    merged = _find_merged(result, "sys1")
    assert merged["name"] == "User Name"
    assert merged["description"] == "User Desc"
    assert merged["status"] == "pending"
    assert merged["scan_meta"] is None


def test_deprecated_rejected_status_skipped() -> None:
    """Objekte mit deprecated/rejected Status → skip (conservative)."""
    ours = _make_ours(
        [
            _make_ours_scanned_object("sys1", name="Deprecated", status="deprecated"),
            _make_ours_scanned_object("sys2", name="Rejected", status="rejected"),
        ]
    )
    theirs = [
        _make_theirs_object("sys1", name="Scan Deprecated"),
        _make_theirs_object("sys2", name="Scan Rejected"),
    ]

    result = merge_into_ist_three_way(ours, theirs)

    assert result.objects_updated == 0
    m1 = _find_merged(result, "sys1")
    assert m1["name"] == "Deprecated"
    assert m1["status"] == "deprecated"
    m2 = _find_merged(result, "sys2")
    assert m2["name"] == "Rejected"
    assert m2["status"] == "rejected"


def test_ours_not_a_dict() -> None:
    """OURS ist kein dict (z. B. None) → alle THEIRS werden new."""
    theirs = [
        _make_theirs_object("a"),
    ]

    result = merge_into_ist_three_way({}, theirs)  # type: ignore[arg-type]

    assert result.objects_new == 1
    assert len(result.merged_objects) == 1


def test_ours_without_nodes_key() -> None:
    """OURS hat keinen 'nodes'-Key → alle THEIRS werden new."""
    theirs = [
        _make_theirs_object("a"),
        _make_theirs_object("b"),
    ]

    result = merge_into_ist_three_way({"version": "1"}, theirs)

    assert result.objects_new == 2
    assert result.objects_missing == 0


# ── Pure helpers: keys ──────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("obj", "expected"),
    [
        ({"id": "x"}, "x"),
        ({"key": "k"}, "k"),
        ({"id": "x", "key": "k"}, "x"),
        ({}, None),
        ({"id": 1}, None),
        ({"key": None}, None),
    ],
)
def test_object_key_prefers_id_then_key(obj: dict[str, Any], expected: str | None) -> None:
    """The merge key is the string id, else the string key, else None."""
    assert _object_key(obj) == expected


@pytest.mark.parametrize(
    ("obj_id", "expected"),
    [
        ("app", True),
        ("app.core", True),
        ("app.gjo_se_com", True),
        ("app__x", True),
        ("x__app.core", True),
        ("backend", False),
        ("a__b", False),
    ],
)
def test_is_namespace_root_key(obj_id: str, expected: bool) -> None:
    """Namespace roots and edges touching them are recognised."""
    assert _is_namespace_root_key(obj_id) is expected


# ── _decide_merge matrix ────────────────────────────────────────────────────


def test_decide_merge_new_sets_pending() -> None:
    """A THEIRS-only object becomes new with a pending status."""
    merged, outcome = _decide_merge(None, {"id": "x"}, _NOW)

    assert outcome == "new"
    assert merged["status"] == "viscera-pending"


def test_decide_merge_missing_with_scan_meta() -> None:
    """An OURS-only scanned object becomes scan_missing."""
    merged, outcome = _decide_merge({"id": "x", "scan_meta": {}}, None, _NOW)

    assert outcome == "missing"
    assert merged["status"] == "viscera-scan_missing"


def test_decide_merge_user_created_is_skipped() -> None:
    """A user-created object (no scan_meta) is skipped."""
    _, outcome = _decide_merge({"id": "x", "scan_meta": None}, None, _NOW)

    assert outcome == "skipped"


def test_decide_merge_approved_is_skipped() -> None:
    """An approved (locked) object is skipped."""
    _, outcome = _decide_merge({"id": "x", "scan_meta": {}, "status": "viscera-approved"}, {"id": "x"}, _NOW)

    assert outcome == "skipped"


def test_decide_merge_pending_is_updated() -> None:
    """A pending object is overwritten with THEIRS."""
    merged, outcome = _decide_merge(
        {"id": "x", "scan_meta": {}, "status": "viscera-pending"}, {"id": "x", "name": "new"}, _NOW
    )

    assert outcome == "updated"
    assert merged["name"] == "new"


def test_decide_merge_scan_missing_is_updated() -> None:
    """A scan_missing object is overwritten and reset to pending."""
    merged, outcome = _decide_merge(
        {"id": "x", "scan_meta": {}, "status": "viscera-scan_missing"}, {"id": "x", "name": "n"}, _NOW
    )

    assert outcome == "updated"
    assert merged["status"] == "viscera-pending"


def test_decide_merge_other_status_is_skipped() -> None:
    """Any other status (deprecated/rejected) is skipped."""
    _, outcome = _decide_merge({"id": "x", "scan_meta": {}, "status": "viscera-deprecated"}, {"id": "x"}, _NOW)

    assert outcome == "skipped"


# ── persist_merge_result ────────────────────────────────────────────────────


def test_persist_merge_result_writes_new_object_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """A new scanned object is persisted as nodes/{id}.yml."""
    _patch_root(monkeypatch, tmp_path)
    theirs = [{"id": "backend", "name": "Backend", "description": "", "status": "viscera-approved"}]

    result = persist_merge_result(theirs, "nodes")

    assert isinstance(result, MergeResult)
    assert (tmp_path / "nodes" / "backend.yml").exists()
