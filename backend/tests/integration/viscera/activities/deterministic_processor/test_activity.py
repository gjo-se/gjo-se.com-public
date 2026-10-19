"""Integration test for the deterministic-processor activity orchestration.

The handler opens real DB sessions and merges through the persistence boundary.
The merge call itself is replaced at the public service symbol, so no
architecture files are written and no catalog data is read.
"""

from __future__ import annotations

import json
from types import SimpleNamespace
from typing import Any

import pytest

from app.viscera.activities.deterministic_processor import activity as svc
from app.viscera.activities.deterministic_processor.activity import run
from app.viscera.schemas.architecture_schemas import MergeResult

pytestmark = pytest.mark.integration


def _patch_store(monkeypatch: pytest.MonkeyPatch, arch: Any) -> None:
    monkeypatch.setattr(svc, "ArchitectureStore", lambda: SimpleNamespace(root=lambda: arch))


@pytest.mark.asyncio
async def test_run_builds_objects_edges_and_diagrams(monkeypatch: pytest.MonkeyPatch, tmp_path: Any) -> None:
    """One labelled service becomes an object + dependency edge + a system node."""
    arch = tmp_path / "architecture"
    imports = arch / "_pipeline" / "imports"
    imports.mkdir(parents=True)
    (imports / "docker.json").write_text(
        json.dumps(
            {
                "docker": [
                    {
                        "name": "api",
                        "labels": {"viscera.system": "backend", "viscera.type": "container"},
                        "depends_on": ["db"],
                    }
                ]
            }
        )
    )
    _patch_store(monkeypatch, arch)

    def _persist(theirs: list[dict[str, Any]], source_dir: str = "nodes") -> MergeResult:
        return MergeResult(merged_objects=list(theirs), objects_new=3)

    monkeypatch.setattr("app.viscera.activities.deterministic_processor.er.persist_merge_result", _persist)
    monkeypatch.setattr("app.viscera.activities.deterministic_processor.diagrams.persist_merge_result", _persist)

    out = await run(None, {})

    assert out["ok"] is True
    assert out["objects_created"] == 2  # the service + the missing 'backend' system node
    assert out["edges_created"] == 1
    assert out["diagrams_created"] == 3
