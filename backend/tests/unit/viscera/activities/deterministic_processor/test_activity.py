"""Unit tests for the deterministic-processor activity entry orchestration.

The Restate handler itself is a large orchestrator; its pure docker-service
helpers (C4 labels, descriptions, depends_on edges, missing-system nodes) are
tested directly. No DB, no Restate, no subprocess.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any

import pytest

from app.viscera.activities.deterministic_processor import activity as svc
from app.viscera.activities.deterministic_processor.activity import (
    _build_depends_on_edges,
    _build_description,
    _build_missing_system_nodes,
    _read_c4_labels,
    _resolve_project_root,
    run,
)

pytestmark = pytest.mark.unit

_NOW = datetime(2026, 1, 1, tzinfo=UTC)


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


def test_read_c4_labels_returns_none_without_required_labels() -> None:
    """Missing ``viscera.system``/``viscera.type`` yields ``None``."""
    assert _read_c4_labels({"labels": {"viscera.system": "backend"}}) is None
    assert _read_c4_labels({}) is None


def test_read_c4_labels_parses_type_parent_and_external() -> None:
    """C4 classification is read with parent override and external flag."""
    svc = {
        "labels": {
            "viscera.system": "backend",
            "viscera.type": "container",
            "viscera.parent": "platform",
            "viscera.external": "true",
        }
    }

    labels = _read_c4_labels(svc)

    assert labels == {"parent": "platform", "type": "container", "external": True}


def test_build_description_uses_top_candidate_name() -> None:
    """The top candidate name prefixes the C4 type; otherwise the type alone."""
    assert _build_description([{"name": "FastAPI"}], "container") == "FastAPI container"
    assert _build_description([], "container") == "container"


def test_build_depends_on_edges_supports_both_forms() -> None:
    """Both list and dict ``depends_on`` forms produce dependency edges."""
    list_edges = _build_depends_on_edges("app", ["db", "redis"], _NOW)
    dict_edges = _build_depends_on_edges("app", {"db": {"condition": "ok"}}, _NOW)

    assert [edge["to"] for edge in list_edges] == ["db", "redis"]
    assert len(dict_edges) == 1
    assert list_edges[0] == {
        "id": "app__db",
        "from": "app",
        "to": "db",
        "description": "Depends on",
        "technology": "docker",
        "status": "pending",
        "scan_meta": {"last_scan_at": _NOW.isoformat()},
    }


def test_build_depends_on_edges_empty_returns_list() -> None:
    """An absent ``depends_on`` yields no edges."""
    assert _build_depends_on_edges("app", None, _NOW) == []


def test_build_missing_system_nodes_only_for_unknown_names() -> None:
    """Only referenced systems without an existing object become system nodes."""
    nodes = _build_missing_system_nodes({"a", "b"}, [{"id": "a"}], _NOW)

    assert [node["id"] for node in nodes] == ["b"]
    assert nodes[0]["type"] == "system"
    assert nodes[0]["status"] == "pending"


# ── _resolve_project_root / run (orchestration, fakes) ───────────────────────


def _patch_store(monkeypatch: pytest.MonkeyPatch, arch: Any) -> None:
    monkeypatch.setattr(svc, "ArchitectureStore", lambda: SimpleNamespace(root=lambda: arch))


def test_resolve_project_root_prefers_candidate_with_compose_file(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Any
) -> None:
    """The candidate whose parent holds a ``docker-compose.yml`` wins."""
    arch = tmp_path / "architecture"
    (tmp_path / "docker-compose.yml").write_text("")
    _patch_store(monkeypatch, arch)

    assert _resolve_project_root() == tmp_path


@pytest.mark.asyncio
async def test_run_reports_exact_imports_path_when_missing(monkeypatch: pytest.MonkeyPatch, tmp_path: Any) -> None:
    """A missing ``imports/docker.json`` yields ``ok=False`` naming the exact path."""
    arch = tmp_path / "architecture"
    _patch_store(monkeypatch, arch)

    out = await run(None, {})

    assert out["ok"] is False
    assert str(arch / "_pipeline" / "imports" / "docker.json") in out["error"]


@pytest.mark.asyncio
async def test_run_returns_ok_zero_without_services(monkeypatch: pytest.MonkeyPatch, tmp_path: Any) -> None:
    """An empty ``docker`` list short-circuits to a zeroed success result."""
    arch = tmp_path / "architecture"
    imports = arch / "_pipeline" / "imports"
    imports.mkdir(parents=True)
    (imports / "docker.json").write_text(json.dumps({"docker": []}))
    _patch_store(monkeypatch, arch)

    out = await run(None, {})

    assert out == {"ok": True, "objects_created": 0, "edges_created": 0}


@pytest.mark.asyncio
async def test_run_wraps_unexpected_errors(monkeypatch: pytest.MonkeyPatch, tmp_path: Any) -> None:
    """An unexpected failure inside the try-block is reported as ``ok=False``."""
    arch = tmp_path / "architecture"
    imports = arch / "_pipeline" / "imports"
    imports.mkdir(parents=True)
    (imports / "docker.json").write_text(json.dumps({"docker": {"x": 1}}))
    _patch_store(monkeypatch, arch)

    out = await run(None, {})

    assert out["ok"] is False
    assert "Unexpected error" in out["error"]
