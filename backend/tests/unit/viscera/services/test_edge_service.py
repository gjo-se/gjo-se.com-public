"""Unit tests for the edge service (YAML CRUD under ``edges/``).

The edges directory is redirected to a tmp folder by patching the public
``ArchitectureStore.edges_dir`` method – no real architecture files are touched.
"""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest

from app.viscera.services import edge_service

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


@pytest.fixture()
def edges_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Path]:
    """Redirect the edges directory to a per-test tmp folder."""
    target = tmp_path / "edges"
    monkeypatch.setattr(edge_service.ArchitectureStore, "edges_dir", lambda self: target)
    yield target


def test_create_edge_writes_composite_filename(edges_dir: Path) -> None:
    """An edge is stored as ``{from}__{to}.yml`` and returned."""
    created = edge_service.create_edge({"from": "a", "to": "b", "description": "calls"})

    assert created == {"from": "a", "to": "b", "description": "calls"}
    assert (edges_dir / "a__b.yml").is_file()


def test_create_edge_rejects_duplicate(edges_dir: Path) -> None:
    """A second edge between the same endpoints is rejected."""
    edge_service.create_edge({"from": "a", "to": "b"})

    with pytest.raises(ValueError, match="already exists"):
        edge_service.create_edge({"from": "a", "to": "b"})


def test_list_edges_returns_all_edges(edges_dir: Path) -> None:
    """All persisted edges are returned."""
    edge_service.create_edge({"from": "a", "to": "b"})
    edge_service.create_edge({"from": "b", "to": "c"})

    edges = edge_service.list_edges()

    assert {(edge["from"], edge["to"]) for edge in edges} == {("a", "b"), ("b", "c")}


def test_update_edge_applies_whitelisted_fields_only(edges_dir: Path) -> None:
    """Only whitelisted fields are merged; unknown keys are ignored."""
    edge_service.create_edge({"from": "a", "to": "b", "description": "old"})

    updated = edge_service.update_edge("a__b", {"description": "new", "from": "hacked"})

    assert updated["description"] == "new"
    assert updated["from"] == "a"


def test_delete_edge_removes_file_and_missing_raises(edges_dir: Path) -> None:
    """Deleting removes the file; a second delete is rejected."""
    edge_service.create_edge({"from": "a", "to": "b"})

    edge_service.delete_edge("a__b")

    assert not (edges_dir / "a__b.yml").exists()
    with pytest.raises(ValueError, match="not found"):
        edge_service.delete_edge("a__b")
