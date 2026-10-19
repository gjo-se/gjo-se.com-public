"""Unit tests for the group service (YAML CRUD under ``groups/``).

The groups and nodes directories are redirected to tmp folders by patching the
public ``ArchitectureStore`` methods – member validation is exercised without
touching the real architecture tree.
"""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest

from app.viscera.schemas.architecture_schemas import (
    CreateGroupRequest,
    UpdateGroupMembersRequest,
    UpdateGroupRequest,
)
from app.viscera.services import group_service

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


@pytest.fixture()
def groups_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Path]:
    """Redirect groups/ and nodes/ to per-test tmp folders."""
    groups = tmp_path / "groups"
    nodes = tmp_path / "nodes"
    monkeypatch.setattr(group_service.ArchitectureStore, "groups_dir", lambda self: groups)
    monkeypatch.setattr(group_service.ArchitectureStore, "nodes_dir", lambda self: nodes)
    yield groups


def _create_node(groups_dir: Path, node_id: str) -> None:
    """Write a minimal node file so member validation accepts it."""
    nodes_dir = groups_dir.parent / "nodes"
    nodes_dir.mkdir(parents=True, exist_ok=True)
    (nodes_dir / f"{node_id}.yml").write_text(f"id: {node_id}\n", encoding="utf-8")


def test_create_group_persists_with_empty_members(groups_dir: Path) -> None:
    """A new group is written with an empty members list."""
    response = group_service.create_group(CreateGroupRequest(id="g1", name="Group 1", description="desc"))

    assert response.id == "g1"
    assert response.members == []
    assert (groups_dir / "g1.yml").is_file()


def test_create_group_raises_for_existing_id(groups_dir: Path) -> None:
    """A group id may not be created twice."""
    group_service.create_group(CreateGroupRequest(id="g1", name="Group 1"))

    with pytest.raises(ValueError, match="already exists"):
        group_service.create_group(CreateGroupRequest(id="g1", name="Other"))


def test_create_group_raises_when_id_collides_with_node(groups_dir: Path) -> None:
    """A group id colliding with an existing node id is rejected."""
    _create_node(groups_dir, "n1")

    with pytest.raises(ValueError, match="conflicts with an existing node"):
        group_service.create_group(CreateGroupRequest(id="n1", name="Group"))


def test_update_group_applies_only_provided_fields(groups_dir: Path) -> None:
    """Only non-None metadata fields are updated."""
    group_service.create_group(CreateGroupRequest(id="g1", name="Old", description="keep"))

    updated = group_service.update_group("g1", UpdateGroupRequest(name="New"))

    assert updated.name == "New"
    assert updated.description == "keep"


def test_update_group_members_adds_existing_node(groups_dir: Path) -> None:
    """An existing node id is added to the members list."""
    group_service.create_group(CreateGroupRequest(id="g1", name="Group 1"))
    _create_node(groups_dir, "n1")

    updated = group_service.update_group_members("g1", UpdateGroupMembersRequest(add=["n1"]))

    assert updated.members == ["n1"]


def test_update_group_members_rejects_unknown_node(groups_dir: Path) -> None:
    """Adding a member that has no node file is rejected."""
    group_service.create_group(CreateGroupRequest(id="g1", name="Group 1"))

    with pytest.raises(ValueError, match="does not exist as a node"):
        group_service.update_group_members("g1", UpdateGroupMembersRequest(add=["ghost"]))


def test_update_group_members_rejects_group_as_member(groups_dir: Path) -> None:
    """A group id must not be used as a member (no nesting)."""
    group_service.create_group(CreateGroupRequest(id="g1", name="Group 1"))
    group_service.create_group(CreateGroupRequest(id="g2", name="Group 2"))

    with pytest.raises(ValueError, match="is a group"):
        group_service.update_group_members("g1", UpdateGroupMembersRequest(add=["g2"]))
