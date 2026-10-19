"""Unit-Tests für die Objekt-/Edge-CRUD-Fassade (architecture_service).

Deckt die Existenzprüfung, das Erzeugen/Löschen von Objekten und das
Erzeugen/Löschen von Edges ab. Die YAML-Primitive, Validierung und der Merge
haben eigene Spiegel-Tests. Root wird per ``ArchitectureStore``-Patch injiziert;
kein Netz, keine DB.
"""

from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

from app.viscera.schemas.architecture_schemas import CreateEdgeRequest, CreateObjectRequest
from app.viscera.services import architecture_service
from app.viscera.services.architecture_service import (
    _object_exists_in_files,
    create_edge,
    create_object,
    delete_edge,
    delete_object_from_ist,
)

pytestmark = pytest.mark.unit


def _patch_root(monkeypatch: pytest.MonkeyPatch, root: Path) -> None:
    """Point ArchitectureStore().root() at the given temporary directory."""
    monkeypatch.setattr(
        architecture_service,
        "ArchitectureStore",
        lambda _source=architecture_service.SOURCE_CODE: SimpleNamespace(root=lambda: root),
    )


def test_object_exists_in_files_true_and_false(tmp_path: Path) -> None:
    """Existing node files are detected by id."""
    (tmp_path / "nodes").mkdir()
    (tmp_path / "nodes" / "x.yml").write_text("id: x\n", encoding="utf-8")

    assert _object_exists_in_files(tmp_path, "x") is True
    assert _object_exists_in_files(tmp_path, "y") is False


def test_delete_object_from_ist_removes_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """The object file is removed and a deleted status returned."""
    nodes = tmp_path / "nodes"
    nodes.mkdir()
    obj = nodes / "x.yml"
    obj.write_text("id: x\n", encoding="utf-8")
    _patch_root(monkeypatch, tmp_path)

    assert delete_object_from_ist("x") == {"status": "deleted", "message": "Object 'x' deleted"}
    assert not obj.exists()


def test_delete_object_from_ist_missing_raises(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """A missing object file raises ValueError."""
    (tmp_path / "nodes").mkdir()
    _patch_root(monkeypatch, tmp_path)

    with pytest.raises(ValueError):
        delete_object_from_ist("nope")


def test_create_object_writes_approved_node(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """A created object is written as an approved node with all optional fields."""
    _patch_root(monkeypatch, tmp_path)

    obj = create_object(
        CreateObjectRequest(
            id="svc",
            name="Svc",
            type="Container",
            description="d",
            technologies=["py"],
            tags=["t"],
            parent="sys",
        )
    )

    assert obj["status"] == "viscera-approved"
    assert obj["scan_meta"] is None
    assert obj["type"] == "Container"
    assert obj["technologies"] == ["py"]
    assert obj["tags"] == ["t"]
    assert obj["parent"] == "sys"
    assert (tmp_path / "nodes" / "svc.yml").exists()


def test_create_object_omits_unset_optional_fields(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Optional fields are omitted and the description defaults to empty."""
    _patch_root(monkeypatch, tmp_path)

    obj = create_object(CreateObjectRequest(id="svc", name="Svc"))

    assert obj["description"] == ""
    assert "type" not in obj
    assert "technologies" not in obj
    assert "tags" not in obj
    assert "parent" not in obj


def test_create_object_duplicate_id_raises(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """An already existing id is rejected."""
    (tmp_path / "nodes").mkdir()
    (tmp_path / "nodes" / "svc.yml").write_text("id: svc\n", encoding="utf-8")
    _patch_root(monkeypatch, tmp_path)

    with pytest.raises(ValueError):
        create_object(CreateObjectRequest(id="svc", name="Svc"))


def test_create_edge_validates_and_builds_payload(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """An edge is only written when both endpoints exist, and the payload carries all fields."""
    nodes = tmp_path / "nodes"
    nodes.mkdir()
    for oid in ("a", "b"):
        (nodes / f"{oid}.yml").write_text(f"id: {oid}\n", encoding="utf-8")
    _patch_root(monkeypatch, tmp_path)
    captured: dict[str, Any] = {}

    def _fake_edge(edge_data: dict[str, Any], source: str = "") -> dict[str, Any]:
        captured.update(edge_data)
        captured["_source"] = source
        return edge_data

    monkeypatch.setattr("app.viscera.services.edge_service.create_edge", _fake_edge)

    result = create_edge(
        CreateEdgeRequest(
            from_id="a",
            to_id="b",
            description="d",
            technology="HTTP",
            tags=["t"],
            status="viscera-approved",
        )
    )

    assert captured["from"] == "a"
    assert captured["to"] == "b"
    assert captured["description"] == "d"
    assert captured["technology"] == "HTTP"
    assert captured["tags"] == ["t"]
    assert captured["status"] == "viscera-approved"
    assert result["from"] == "a"


def test_create_edge_missing_endpoint_raises(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """A missing endpoint object is rejected before any write."""
    (tmp_path / "nodes").mkdir()
    (tmp_path / "nodes" / "a.yml").write_text("id: a\n", encoding="utf-8")
    _patch_root(monkeypatch, tmp_path)

    with pytest.raises(ValueError):
        create_edge(CreateEdgeRequest(from_id="a", to_id="missing"))


def test_delete_edge_delegates_to_edge_service(monkeypatch: pytest.MonkeyPatch) -> None:
    """Delete delegates to the edge service with the default source."""
    captured: dict[str, Any] = {}

    def _fake_delete(edge_id: str, source: str = "") -> dict[str, Any]:
        captured["id"] = edge_id
        captured["source"] = source
        return {"status": "deleted"}

    monkeypatch.setattr("app.viscera.services.edge_service.delete_edge", _fake_delete)

    assert delete_edge("a__b") == {"status": "deleted"}
    assert captured == {"id": "a__b", "source": architecture_service.SOURCE_CODE}
