"""Unit tests for the diagram service (YAML CRUD under ``diagrams/``).

The architecture root is redirected to a tmp directory by patching the public
``ArchitectureStore.diagrams_dir`` method – no real architecture files are
touched and no DB/HTTP is involved.
"""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest

from app.viscera.schemas.architecture_schemas import CreateDiagramRequest, UpdateDiagramRequest
from app.viscera.services import diagram_service

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


@pytest.fixture()
def diagrams_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Path]:
    """Redirect the diagrams directory to a per-test tmp folder."""
    target = tmp_path / "diagrams"
    monkeypatch.setattr(diagram_service.ArchitectureStore, "diagrams_dir", lambda self: target)
    yield target


def test_create_diagram_persists_yaml_file(diagrams_dir: Path) -> None:
    """Creating a diagram writes the file and returns the response."""
    response = diagram_service.create_diagram(CreateDiagramRequest(key="d1", name="Diagram 1", type="systemContext"))

    assert response.key == "d1"
    assert response.name == "Diagram 1"
    assert response.status == "viscera-approved"
    assert (diagrams_dir / "d1.yml").is_file()


def test_create_diagram_raises_for_existing_key(diagrams_dir: Path) -> None:
    """Creating a diagram with an existing key is rejected."""
    diagram_service.create_diagram(CreateDiagramRequest(key="d1", name="Diagram 1", type="systemContext"))

    with pytest.raises(ValueError, match="already exists"):
        diagram_service.create_diagram(CreateDiagramRequest(key="d1", name="Other", type="container"))


def test_list_diagrams_returns_all_sorted_by_key(diagrams_dir: Path) -> None:
    """All persisted diagrams are listed, sorted by key."""
    diagram_service.create_diagram(CreateDiagramRequest(key="b", name="B", type="container"))
    diagram_service.create_diagram(CreateDiagramRequest(key="a", name="A", type="systemContext"))

    keys = [diagram.key for diagram in diagram_service.list_diagrams()]

    assert keys == ["a", "b"]


def test_update_diagram_applies_only_provided_fields(diagrams_dir: Path) -> None:
    """Only non-None fields of the update request are written."""
    diagram_service.create_diagram(CreateDiagramRequest(key="d1", name="Old", type="systemContext"))

    updated = diagram_service.update_diagram("d1", UpdateDiagramRequest(name="New"))

    assert updated.name == "New"
    assert updated.type == "systemContext"


def test_update_diagram_nodes_stores_position(diagrams_dir: Path) -> None:
    """Setting a node position persists ``{x, y}`` in the diagram file."""
    diagram_service.create_diagram(CreateDiagramRequest(key="d1", name="D1", type="systemContext"))

    updated = diagram_service.update_diagram_nodes("d1", "n1", x=1.5, y=2.5)

    assert updated.nodes == {"n1": {"x": 1.5, "y": 2.5}}


def test_delete_diagram_removes_file_and_missing_raises(diagrams_dir: Path) -> None:
    """Deleting removes the file; a second delete is rejected."""
    diagram_service.create_diagram(CreateDiagramRequest(key="d1", name="D1", type="systemContext"))

    diagram_service.delete_diagram("d1")

    assert not (diagrams_dir / "d1.yml").exists()
    with pytest.raises(ValueError, match="not found"):
        diagram_service.delete_diagram("d1")
