"""Unit tests for the LLM-enrichment activity helpers.

Covers the template-object filter, the minimal LLM input payload and the
in-place application of enriched descriptions/labels with source marking.
No LLM call and no DB.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from app.viscera.activities import llm_enrichment_activity as lea
from app.viscera.activities.llm_enrichment_activity import _apply_enriched
from app.viscera.services.architecture_yaml_io_service import _load_yaml_file

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


def _catalog_object(obj_id: str, description: str = "Template desc") -> dict[str, Any]:
    """Build an object whose description came from the catalog template."""
    return {
        "id": obj_id,
        "description": description,
        "scan_meta": {"sources": {"description": "catalog"}},
    }


def test_filter_template_objects_keeps_only_catalog_descriptions() -> None:
    """Objects with a non-empty catalog description are the only candidates."""
    objects = [
        _catalog_object("keep"),
        {"id": "user", "description": "manual", "scan_meta": None},
        _catalog_object("empty", description="   "),
    ]

    candidates = lea._filter_template_objects(objects)

    assert [obj["id"] for obj in candidates] == ["keep"]


def test_build_llm_input_includes_id_description_and_edge_label() -> None:
    """The payload carries id, description and an optional edge_label."""
    candidates = [
        {"id": "a", "description": "desc"},
        {"id": "b", "description": "desc", "edge_label": "calls"},
    ]

    payload = lea._build_llm_input(candidates)

    assert payload == [
        {"id": "a", "description": "desc"},
        {"id": "b", "description": "desc", "edge_label": "calls"},
    ]


def test_build_llm_input_omits_missing_or_blank_fields() -> None:
    """Missing/blank description or edge_label keys are not added to the payload."""
    payload = lea._build_llm_input([{"id": "a"}, {"id": "b", "edge_label": ""}])

    assert payload == [{"id": "a"}, {"id": "b"}]


def test_apply_enriched_updates_description_and_marks_llm_source() -> None:
    """An improved description is applied and its source switched to ``llm``."""
    candidates = [_catalog_object("a", description="old")]
    output = {"objects": [{"id": "a", "description": "much better"}]}

    descriptions, labels = lea._apply_enriched(candidates, output)

    assert descriptions == 1
    assert labels == 0
    assert candidates[0]["description"] == "much better"
    assert candidates[0]["scan_meta"]["sources"]["description"] == "llm"


def test_apply_enriched_ignores_unchanged_description() -> None:
    """An identical description is not counted as enriched."""
    candidates = [_catalog_object("a", description="same")]
    output = {"objects": [{"id": "a", "description": "same"}]}

    descriptions, labels = lea._apply_enriched(candidates, output)

    assert descriptions == 0
    assert labels == 0
    assert candidates[0]["scan_meta"]["sources"]["description"] == "catalog"


def test_apply_enriched_consumes_object_output_and_enriches_labels() -> None:
    """Output objects with ``model_dump`` are consumed and edge_labels enriched."""

    class _Obj:
        def __init__(self, payload: dict[str, Any]) -> None:
            self._payload = payload

        def model_dump(self) -> dict[str, Any]:
            return self._payload

    class _Output:
        objects = [_Obj({"id": "a", "description": "better", "edge_label": "calls"})]

    candidates = [
        {
            "id": "a",
            "description": "old",
            "edge_label": "old_label",
            "scan_meta": {"sources": {"description": "catalog"}},
        }
    ]

    descriptions, labels = lea._apply_enriched(candidates, _Output())

    assert (descriptions, labels) == (1, 1)
    assert candidates[0]["edge_label"] == "calls"
    assert candidates[0]["scan_meta"]["sources"]["edge_label"] == "llm"


def test_apply_enriched_ignores_unknown_and_idless_entries() -> None:
    """Candidates without a matching enriched id stay untouched."""
    candidates = [_catalog_object("a", description="old")]
    output = {"objects": [{"id": "b", "description": "x"}, {"description": "no id"}]}

    assert _apply_enriched(candidates, output) == (0, 0)
    assert candidates[0]["description"] == "old"


# ── _run_l1_enrichment orchestrator ───────────────────────────────────────────


class _FakeDB:
    async def __aenter__(self) -> _FakeDB:
        return self

    async def __aexit__(self, *_exc: object) -> bool:
        return False


def _patch_executor(
    monkeypatch: pytest.MonkeyPatch, outcome: Any, *, raises: BaseException | None = None
) -> dict[str, Any]:
    """Replace the DB + task executor with fakes, capturing the call kwargs."""
    monkeypatch.setattr(lea, "CoreDB", _FakeDB)
    captured: dict[str, Any] = {}

    class _Executor:
        async def execute_task(self, **kwargs: Any) -> Any:
            captured.update(kwargs)
            if raises is not None:
                raise raises
            return outcome

    monkeypatch.setattr(lea, "get_task_executor_service", _Executor)
    return captured


@pytest.mark.asyncio
async def test_run_l1_enrichment_skips_llm_without_candidates(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """No template objects means no LLM call and a non-skipped, ok result."""
    captured = _patch_executor(monkeypatch, {"success": True, "result": {"objects": []}})

    result = await lea._run_l1_enrichment([{"id": "x", "scan_meta": None}], tmp_path, "pipeline")

    assert result["ok"] is True
    assert result["skipped"] is False
    assert captured == {}


@pytest.mark.asyncio
async def test_run_l1_enrichment_truncates_to_batch_limit(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """More than 20 candidates are truncated before hitting the LLM."""
    candidates = [_catalog_object(f"o{i}") for i in range(25)]
    captured = _patch_executor(monkeypatch, {"success": True, "result": {"objects": []}})

    await lea._run_l1_enrichment(candidates, tmp_path, "pipeline")

    sent = json.loads(captured["variables"]["architecture_objects"])
    assert len(sent) == 20
    assert captured["task_key"] == "scan-code-enrich"


@pytest.mark.asyncio
async def test_run_l1_enrichment_writes_enriched_objects(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Enriched values are applied and written back to the nodes directory."""
    candidates = [_catalog_object("a", description="old")]
    _patch_executor(monkeypatch, {"success": True, "result": {"objects": [{"id": "a", "description": "new desc"}]}})

    result = await lea._run_l1_enrichment(candidates, tmp_path, "pipeline")

    assert result["descriptions_enriched"] == 1
    assert result["ok"] is True
    assert _load_yaml_file(str(tmp_path / "a.yml"))["description"] == "new desc"


@pytest.mark.asyncio
async def test_run_l1_enrichment_gracefully_skips_on_llm_exception(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """An LLM exception results in a graceful skip carrying the reason."""
    _patch_executor(monkeypatch, None, raises=RuntimeError("circuit open"))

    result = await lea._run_l1_enrichment([_catalog_object("a")], tmp_path, "pipeline")

    assert result["skipped"] is True
    assert result["reason"] == "circuit open"
    assert result["ok"] is True


@pytest.mark.asyncio
async def test_run_l1_enrichment_skips_on_unsuccessful_result(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """An unsuccessful LLM result is skipped with the error_type as reason."""
    _patch_executor(monkeypatch, {"success": False, "error_type": "NoModel"})

    result = await lea._run_l1_enrichment([_catalog_object("a")], tmp_path, "pipeline")

    assert result["skipped"] is True
    assert result["reason"] == "NoModel"


@pytest.mark.asyncio
async def test_run_l1_enrichment_skips_on_missing_result(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """A successful call with no result payload is reported as ``no_result``."""
    _patch_executor(monkeypatch, {"success": True, "result": None})

    result = await lea._run_l1_enrichment([_catalog_object("a")], tmp_path, "pipeline")

    assert result["skipped"] is True
    assert result["reason"] == "no_result"


@pytest.mark.asyncio
async def test_run_l1_enrichment_skips_on_apply_failure(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """A malformed LLM output is caught and reported as an apply failure."""
    # ``objects`` without dict entries breaks the id-indexing in the apply step.
    _patch_executor(monkeypatch, {"success": True, "result": {"objects": [42]}})

    result = await lea._run_l1_enrichment([_catalog_object("a")], tmp_path, "pipeline")

    assert result["skipped"] is True
    assert result["reason"].startswith("apply_failed")


@pytest.mark.asyncio
async def test_run_l1_enrichment_reports_write_errors(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """A write failure flips ``ok`` to False and counts the errors."""
    _patch_executor(monkeypatch, {"success": True, "result": {"objects": [{"id": "a", "description": "new"}]}})
    # A directory at the target file path makes the atomic write fail for real.
    (tmp_path / "a.yml").mkdir()

    result = await lea._run_l1_enrichment([_catalog_object("a")], tmp_path, "pipeline")

    assert result["ok"] is False
    assert "Failed to write 1 object files" in result["error"]


@pytest.mark.asyncio
async def test_run_handler_without_nodes_dir_returns_ok(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Without a nodes/ directory the handler reports an empty, non-skipped result."""
    monkeypatch.setattr(lea, "resolve_architecture_dir", lambda: tmp_path)

    result = await lea.run(None, {})

    assert result["ok"] is True
    assert result["skipped"] is False
    assert result["descriptions_enriched"] == 0
    assert result["labels_enriched"] == 0
