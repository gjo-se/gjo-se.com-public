"""Unit tests for the deterministic-processor L3 component aggregation.

Covers object aggregation per ``top_level`` and the cross-component import
edge lifting (intra-component and external imports dropped). No DB, no Restate.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest

from app.viscera.activities.deterministic_processor.components import (
    _build_component_edges,
    _build_component_objects,
    _extend_l3_batches,
    _load_backend_modules,
    _prune_component_data,
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


def _write_backend(arch: Path, body: str) -> None:
    path = arch / "_pipeline" / "imports" / "backend.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body, encoding="utf-8")


def test_build_component_objects_aggregates_sorted_top_levels() -> None:
    """One component object per distinct top_level, sorted by id."""
    modules = [
        {"name": "app.shared.x", "top_level": "app.shared"},
        {"name": "app.crm.y", "top_level": "app.crm"},
        {"name": "app.shared.z", "top_level": "app.shared"},
    ]

    objects = _build_component_objects(modules, _NOW)

    assert [obj["id"] for obj in objects] == ["app.crm", "app.shared"]
    assert all(obj["type"] == "component" and obj["parent"] == "backend" for obj in objects)


def test_build_component_objects_skips_modules_without_top_level() -> None:
    """Modules lacking a ``top_level`` contribute no component."""
    modules = [{"name": "app.a"}, {"name": "app.b", "top_level": ""}, {"name": "app.c", "top_level": "app.c"}]
    assert [obj["id"] for obj in _build_component_objects(modules, _NOW)] == ["app.c"]


def test_build_component_edges_lifts_and_filters_imports() -> None:
    """Cross-component ``app.*`` imports become edges; intra/external are dropped."""
    modules = [
        {"name": "app.shared.x", "top_level": "app.shared", "imports": ["app.crm.y", "os"]},
        {"name": "app.crm.y", "top_level": "app.crm", "imports": []},
        {"name": "app.shared.z", "top_level": "app.shared", "imports": []},
    ]

    edges = _build_component_edges(modules, _NOW)

    assert edges == [
        {
            "id": "app.shared__app.crm",
            "from": "app.shared",
            "to": "app.crm",
            "description": "imports",
            "technology": "python",
            "status": "pending",
            "scan_meta": {"last_scan_at": _NOW.isoformat()},
        }
    ]


def test_build_component_edges_drops_intra_and_unknown() -> None:
    """Intra-component imports and unknown targets are not emitted."""
    modules = [
        {"name": "app.a.x", "top_level": "app.a", "imports": ["app.a.z", "app.unknown.q"]},
        {"name": "app.a.z", "top_level": "app.a", "imports": []},
    ]
    assert _build_component_edges(modules, _NOW) == []


# ── _load_backend_modules ────────────────────────────────────────────────────


def test_load_backend_modules_reads_modules(tmp_path: Path) -> None:
    _write_backend(tmp_path, json.dumps({"backend": {"modules": [{"name": "app.x"}, 5]}}))
    assert _load_backend_modules(tmp_path) == [{"name": "app.x"}]


def test_load_backend_modules_empty_when_file_missing(tmp_path: Path) -> None:
    assert _load_backend_modules(tmp_path) == []


def test_load_backend_modules_empty_on_bad_json(tmp_path: Path) -> None:
    _write_backend(tmp_path, "{not json")
    assert _load_backend_modules(tmp_path) == []


def test_load_backend_modules_empty_without_modules_list(tmp_path: Path) -> None:
    _write_backend(tmp_path, json.dumps({"backend": {"modules": "nope"}}))
    assert _load_backend_modules(tmp_path) == []


# ── _prune_component_data ────────────────────────────────────────────────────


def test_prune_component_data_deletes_stale_component_node(tmp_path: Path) -> None:
    _write_yaml(tmp_path / "nodes" / "c.yml", "id: app.a\ntype: component\nscan_meta:\n  last_scan_at: x\n")
    _prune_component_data(tmp_path, set(), set())
    assert not (tmp_path / "nodes" / "c.yml").exists()


def test_prune_component_data_keeps_fresh_and_user_and_other_types(tmp_path: Path) -> None:
    _write_yaml(tmp_path / "nodes" / "fresh.yml", "id: app.a\ntype: component\nscan_meta:\n  last_scan_at: x\n")
    _write_yaml(tmp_path / "nodes" / "user.yml", "id: app.b\ntype: component\n")
    _write_yaml(tmp_path / "nodes" / "table.yml", "id: app.t\ntype: table\nscan_meta:\n  last_scan_at: x\n")
    _prune_component_data(tmp_path, {"app.a"}, set())
    assert (tmp_path / "nodes" / "fresh.yml").exists()
    assert (tmp_path / "nodes" / "user.yml").exists()
    assert (tmp_path / "nodes" / "table.yml").exists()


def test_prune_component_data_deletes_stale_import_edge(tmp_path: Path) -> None:
    _write_yaml(
        tmp_path / "edges" / "e.yml",
        "id: a__b\ndescription: imports\ntechnology: python\nscan_meta:\n  last_scan_at: x\n",
    )
    _prune_component_data(tmp_path, set(), set())
    assert not (tmp_path / "edges" / "e.yml").exists()


def test_prune_component_data_keeps_non_import_edge(tmp_path: Path) -> None:
    _write_yaml(
        tmp_path / "edges" / "dep.yml",
        "id: a__b\ndescription: references\ntechnology: database\nscan_meta:\n  last_scan_at: x\n",
    )
    _prune_component_data(tmp_path, set(), set())
    assert (tmp_path / "edges" / "dep.yml").exists()


def test_prune_component_data_noop_without_dirs(tmp_path: Path) -> None:
    _prune_component_data(tmp_path, set(), set())  # must not raise


# ── _extend_l3_batches ───────────────────────────────────────────────────────


def test_extend_l3_batches_appends_to_shared_batches(tmp_path: Path) -> None:
    modules: list[dict[str, Any]] = [
        {"name": "app.a.x", "top_level": "app.a", "imports": []},
        {"name": "app.b.y", "top_level": "app.b", "imports": ["app.a.x"]},
    ]
    imports = tmp_path / "_pipeline" / "imports"
    imports.mkdir(parents=True)
    (imports / "backend.json").write_text(json.dumps({"backend": {"modules": modules}}), encoding="utf-8")

    theirs: list[dict[str, Any]] = [{"id": "docker"}]
    edges: list[dict[str, Any]] = [{"id": "docker-edge"}]

    nodes, new_edges = _extend_l3_batches(tmp_path, _NOW, theirs, edges)

    assert {n["id"] for n in nodes} == {"app.a", "app.b"}
    assert [e["id"] for e in new_edges] == ["app.b__app.a"]
    assert len(theirs) == 3  # original + 2 components
    assert len(edges) == 2
