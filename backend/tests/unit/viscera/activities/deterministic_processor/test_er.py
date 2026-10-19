"""Unit tests for the deterministic-processor ER section (tables + FK edges).

Covers the pure table-node construction (incl. ``columns[]`` card payload),
base-qualified FK edge generation, the YAML object loading + prune helpers and
the ``_process_er_section`` orchestration (with a faked merge). No DB, no
Restate, no subprocess.
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

from app.viscera.activities.deterministic_processor import er as svc
from app.viscera.activities.deterministic_processor.er import (
    _build_columns,
    _build_er_diagram_proposals,
    _build_fk_edges,
    _build_table_nodes,
    _existing_reference_edge_ids,
    _existing_table_node_ids,
    _load_object_file,
    _process_er_section,
    _prune_derived_er_data,
    _prune_er_diagrams,
    _read_tables,
    prune_scan_created,
)

pytestmark = pytest.mark.unit

_NOW = datetime(2026, 1, 1, tzinfo=UTC)


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


def _write_yaml(path: Path, body: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body, encoding="utf-8")


# ── pure builders ────────────────────────────────────────────────────────────


def test_build_table_nodes_maps_columns_with_fk_flag() -> None:
    """A table node carries id/name/type and per-column card fields."""
    tables = [
        {
            "name": "crm_address",
            "domain": "crm",
            "columns": [
                {"name": "id", "type": "integer", "nullable": False, "pk": True},
                {"name": "crm_company_id", "type": "integer", "nullable": False, "pk": False},
            ],
            "fks": [{"column": "crm_company_id", "ref_table": "crm_company", "ref_column": "id"}],
        }
    ]

    nodes = _build_table_nodes(tables, "app", _NOW)

    assert nodes[0]["id"] == "app.crm_address"
    assert nodes[0]["type"] == "table"
    assert nodes[0]["columns"] == [
        {"name": "id", "type": "integer", "nullable": False, "pk": True, "fk": False},
        {"name": "crm_company_id", "type": "integer", "nullable": False, "pk": False, "fk": True},
    ]


def test_build_table_nodes_skips_unnamed_and_sorts_by_id() -> None:
    """Tables without a str name are dropped; nodes are sorted by id."""
    tables = [{"name": "b"}, {"name": 1}, {"name": "a"}]

    nodes = _build_table_nodes(tables, "app", _NOW)

    assert [node["id"] for node in nodes] == ["app.a", "app.b"]


def test_build_columns_filters_non_named_entries() -> None:
    """Non-dict columns and columns without a ``name`` are dropped."""
    table = {"columns": [{"name": "id"}, "junk", {"type": "int"}, {"name": "x", "nullable": True}]}

    columns = _build_columns(table)

    assert [c["name"] for c in columns] == ["id", "x"]
    assert columns[1]["nullable"] is True


def test_build_fk_edges_base_qualifies_both_endpoints() -> None:
    """Each FK produces a ``references`` edge between base-qualified tables."""
    tables = [{"name": "crm_address", "fks": [{"ref_table": "crm_company"}]}]

    edges = _build_fk_edges(tables, "app", _NOW)

    assert edges[0]["id"] == "app.crm_address__app.crm_company"
    assert edges[0]["description"] == "references"


def test_build_fk_edges_skips_invalid_entries_and_sorts() -> None:
    """FKs without a str ref_table are skipped; edges are sorted by id."""
    tables = [
        {"name": "t", "fks": [{"ref_table": "z"}, {"ref_table": 5}, "junk"]},
        {"name": "u", "fks": [{"ref_table": "a"}]},
    ]

    edges = _build_fk_edges(tables, "app", _NOW)

    assert [e["id"] for e in edges] == ["app.t__app.z", "app.u__app.a"]


# ── _load_object_file ────────────────────────────────────────────────────────


def test_load_object_file_returns_dict_for_valid_yaml(tmp_path: Path) -> None:
    _write_yaml(tmp_path / "o.yml", "id: app.t\nname: t\n")
    assert _load_object_file(tmp_path / "o.yml") == {"id": "app.t", "name": "t"}


def test_load_object_file_returns_none_for_non_mapping(tmp_path: Path) -> None:
    _write_yaml(tmp_path / "list.yml", "- 1\n- 2\n")
    assert _load_object_file(tmp_path / "list.yml") is None


def test_load_object_file_returns_none_on_missing_file(tmp_path: Path) -> None:
    assert _load_object_file(tmp_path / "absent.yml") is None


# ── _read_tables ─────────────────────────────────────────────────────────────


def _write_tables(arch: Path, filename: str, body: str) -> None:
    path = arch / "_pipeline" / "tables" / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body, encoding="utf-8")


def test_read_tables_returns_dict_rows(tmp_path: Path) -> None:
    _write_tables(tmp_path, "app.json", '{"tables": [{"name": "t1"}, 5]}')
    assert _read_tables("app", tmp_path) == [{"name": "t1"}]


def test_read_tables_returns_empty_when_file_missing(tmp_path: Path) -> None:
    assert _read_tables("app", tmp_path) == []


def test_read_tables_returns_empty_on_bad_json(tmp_path: Path) -> None:
    _write_tables(tmp_path, "app.json", "{not json")
    assert _read_tables("app", tmp_path) == []


def test_read_tables_returns_empty_without_tables_list(tmp_path: Path) -> None:
    _write_tables(tmp_path, "app.json", '{"other": 1}')
    assert _read_tables("app", tmp_path) == []


# ── _existing_*_ids ──────────────────────────────────────────────────────────


def test_existing_table_node_ids_reads_table_nodes(tmp_path: Path) -> None:
    _write_yaml(tmp_path / "nodes" / "t.yml", "id: app.t\ntype: table\n")
    _write_yaml(tmp_path / "nodes" / "other.yml", "id: app.o\ntype: container\n")
    assert _existing_table_node_ids(tmp_path) == {"app.t"}


def test_existing_table_node_ids_empty_without_dir(tmp_path: Path) -> None:
    assert _existing_table_node_ids(tmp_path) == set()


def test_existing_reference_edge_ids_reads_reference_edges(tmp_path: Path) -> None:
    _write_yaml(tmp_path / "edges" / "e.yml", "id: a__b\ndescription: references\n")
    _write_yaml(tmp_path / "edges" / "x.yml", "id: c__d\ndescription: depends-on\n")
    assert _existing_reference_edge_ids(tmp_path) == {"a__b"}


# ── prune helpers ────────────────────────────────────────────────────────────


def test_prune_scan_created_deletes_stale_scanner_file(tmp_path: Path) -> None:
    _write_yaml(tmp_path / "nodes" / "stale.yml", "id: app.stale\ntype: table\nscan_meta:\n  last_scan_at: x\n")
    prune_scan_created(tmp_path, "nodes", set(), lambda d: d.get("type") == "table", label="table node")
    assert not (tmp_path / "nodes" / "stale.yml").exists()


def test_prune_scan_created_keeps_fresh_and_user_files(tmp_path: Path) -> None:
    _write_yaml(tmp_path / "nodes" / "fresh.yml", "id: app.fresh\ntype: table\nscan_meta:\n  last_scan_at: x\n")
    _write_yaml(tmp_path / "nodes" / "user.yml", "id: app.user\ntype: table\n")
    prune_scan_created(tmp_path, "nodes", {"app.fresh"}, lambda d: d.get("type") == "table", label="table node")
    assert (tmp_path / "nodes" / "fresh.yml").exists()
    assert (tmp_path / "nodes" / "user.yml").exists()


def test_prune_scan_created_noop_without_dir(tmp_path: Path) -> None:
    prune_scan_created(tmp_path, "nodes", set(), lambda _d: True, label="x")  # must not raise


def test_prune_derived_er_data_removes_nothing_when_all_fresh(tmp_path: Path) -> None:
    _write_yaml(tmp_path / "nodes" / "t.yml", "id: app.t\ntype: table\nscan_meta:\n  last_scan_at: x\n")
    _prune_derived_er_data(tmp_path, {"app.t"}, {"app.t__app.u"})
    assert (tmp_path / "nodes" / "t.yml").exists()


# ── ER diagram proposals / prune ─────────────────────────────────────────────


def test_build_er_diagram_proposals_only_for_active_base() -> None:
    proposals = _build_er_diagram_proposals(["app"], _NOW)
    assert len(proposals) == 1
    assert proposals[0]["key"] == "er-app"
    assert proposals[0]["parent"] == "db"
    assert proposals[0]["type"] == "dataModel"
    assert _build_er_diagram_proposals([], _NOW) == []


def test_prune_er_diagrams_removes_stale_and_keeps_active(tmp_path: Path) -> None:
    _write_yaml(tmp_path / "diagrams" / "stale.yml", "type: dataModel\nbase: old\nscan_meta:\n  last_scan_at: x\n")
    _write_yaml(tmp_path / "diagrams" / "keep.yml", "type: dataModel\nbase: app\nscan_meta:\n  last_scan_at: x\n")
    pruned = _prune_er_diagrams(tmp_path, ["app"])
    assert pruned == 1
    assert not (tmp_path / "diagrams" / "stale.yml").exists()
    assert (tmp_path / "diagrams" / "keep.yml").exists()


def test_prune_er_diagrams_noop_without_dir(tmp_path: Path) -> None:
    assert _prune_er_diagrams(tmp_path, ["app"]) == 0


# ── _process_er_section ──────────────────────────────────────────────────────


def test_process_er_section_persists_tables_and_fk_edges(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    _write_tables(
        tmp_path,
        "app.json",
        '{"tables": [{"name": "crm_address", "fks": [{"ref_table": "crm_company"}]}]}',
    )
    calls: list[str] = []

    def _persist(_theirs: Any, *, source_dir: str) -> Any:
        calls.append(source_dir)
        return SimpleNamespace(objects_updated=0, objects_new=1, objects_missing=0)

    monkeypatch.setattr(svc, "persist_merge_result", _persist)

    out = _process_er_section(tmp_path, _NOW, [], [])

    assert out["table_nodes"] == 1
    assert out["fk_edges"] == 1
    assert out["node_merge_result"] is not None
    assert out["er_diagram_proposals"][0]["key"] == "er-app"
    assert "nodes" in calls and "edges" in calls


def test_process_er_section_without_tables_has_no_merge(tmp_path: Path) -> None:
    out = _process_er_section(tmp_path, _NOW, [], [])
    assert out["table_nodes"] == 0
    assert out["fk_edges"] == 0
    assert out["node_merge_result"] is None
    assert out["er_diagram_proposals"] == []
