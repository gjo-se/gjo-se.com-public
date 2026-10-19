"""Unit tests for the deterministic-processor technology-candidate lookup.

Covers the pure parsing/helper surface (image slug, dependency slug,
pyproject/package.json dependency extraction). The async DB/vector paths are
integration-level and not exercised here. No DB, no Restate, no subprocess.
"""

from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

from app.viscera.activities.deterministic_processor.tech_lookup import (
    MAX_TECHNOLOGY_CANDIDATES,
    _append_dependency_candidates,
    _build_context_path,
    _collect_service_candidates,
    _dependency_slug,
    _extract_package_json_dependencies,
    _extract_pyproject_dependencies,
    _lookup_build_candidates,
    _lookup_technology_candidates,
    _parse_image_slug,
    _resolve_build_dir,
    _stage1_db_lookup,
    _stage2_vector_search,
)

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """Skip the suite-wide schema bootstrap (unit test without DB)."""
    return


def test_parse_image_slug_strips_registry_tag_and_version() -> None:
    """Only the bare image name remains."""
    assert _parse_image_slug("grafana/loki:3.0.0") == "loki"
    assert _parse_image_slug("postgres:16") == "postgres"


def test_dependency_slug_normalises_declarations() -> None:
    """Extras, version constraints and npm scopes are stripped."""
    assert _dependency_slug("fastapi[standard]>=0.135") == "fastapi"
    assert _dependency_slug("@tanstack/react-query") == "react-query"
    assert _dependency_slug("Django") == "django"


def test_extract_pyproject_dependencies_reads_project_table() -> None:
    """Only ``project.dependencies`` strings are returned."""
    content = '[project]\ndependencies = ["fastapi>=0.1", "uvicorn"]'

    assert _extract_pyproject_dependencies(content) == ["fastapi>=0.1", "uvicorn"]


def test_extract_pyproject_dependencies_returns_empty_on_invalid_toml() -> None:
    """A TOML parse error yields no dependencies."""
    assert _extract_pyproject_dependencies("not = = valid") == []


def test_extract_package_json_dependencies_reads_both_sections() -> None:
    """Both ``dependencies`` and ``devDependencies`` names are collected."""
    data: dict[str, Any] = {"dependencies": {"react": "^18"}, "devDependencies": {"vitest": "^1"}}

    names = _extract_package_json_dependencies(data)

    assert set(names) == {"react", "vitest"}


# ── fakes for the async DB/embedding boundaries ──────────────────────────────
class _Scalars:
    def __init__(self, items: list[Any]) -> None:
        self._items = items

    def __iter__(self) -> Any:
        return iter(self._items)

    def all(self) -> list[Any]:
        return list(self._items)


class _Result:
    def __init__(self, one: Any = None, many: tuple[Any, ...] = ()) -> None:
        self._one = one
        self._many = list(many)

    def scalar_one_or_none(self) -> Any:
        return self._one

    def scalars(self) -> _Scalars:
        return _Scalars(self._many)


class _DB:
    def __init__(self, *results: _Result) -> None:
        self._queue = list(results)

    async def execute(self, _stmt: Any) -> _Result:
        return self._queue.pop(0)


def _failing_embedding_client() -> Any:
    class _Client:
        async def embed_text(self, *_a: Any) -> list[float]:
            raise RuntimeError("no embedding")

    return _Client()


def _embed(vector: list[float]) -> Any:
    async def _embed_text(*_a: Any) -> list[float]:
        return vector

    return _embed_text


def _tech(slug: str, name: str, vector: list[float] | None = None) -> SimpleNamespace:
    return SimpleNamespace(slug=slug, name=name, vector=vector)


# ── _build_context_path / _resolve_build_dir ─────────────────────────────────


def test_build_context_path_handles_all_forms() -> None:
    assert _build_context_path({"context": "./frontend"}) == Path("./frontend")
    assert _build_context_path({"no-context": 1}) is None
    assert _build_context_path("./backend") == Path("./backend")
    assert _build_context_path("") is None
    assert _build_context_path(None) is None


def test_resolve_build_dir_prefers_subdir_then_root_fallback(tmp_path: Any) -> None:
    sub = tmp_path / "backend"
    sub.mkdir()
    assert _resolve_build_dir(tmp_path, Path("backend")) == sub
    # context not mounted → fall back to project root
    assert _resolve_build_dir(tmp_path, Path("missing")) == tmp_path


def test_resolve_build_dir_returns_none_without_any_dir(tmp_path: Any) -> None:
    missing_root = tmp_path / "nope"
    assert _resolve_build_dir(missing_root, Path("x")) is None


# ── _stage1_db_lookup ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_stage1_db_lookup_dedups_and_caps() -> None:
    world = _tech("world", "World")
    w2 = _tech("world2", "World2")
    db = _DB(_Result(one=world), _Result(many=(world, w2)))

    out = await _stage1_db_lookup("world", db)

    assert out[0] == {"slug": "world", "name": "World", "source": "db-exact"}
    assert out[1]["source"] == "db-contains"
    assert [c["slug"] for c in out] == ["world", "world2"]


@pytest.mark.asyncio
async def test_stage1_db_lookup_empty_when_nothing_matches() -> None:
    db = _DB(_Result(one=None), _Result(many=()))
    assert await _stage1_db_lookup("nope", db) == []


# ── _append_dependency_candidates ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_append_dependency_candidates_skips_empty_slug() -> None:
    candidates: list[dict[str, str]] = []
    seen: set[str] = set()

    await _append_dependency_candidates("", "src", _DB(), candidates, seen)

    assert candidates == []
    assert seen == set()


@pytest.mark.asyncio
async def test_append_dependency_candidates_dedups() -> None:
    db = _DB(
        _Result(one=_tech("fastapi", "FastAPI")),
        _Result(),
        _Result(one=_tech("fastapi", "FastAPI")),
        _Result(),
    )
    candidates: list[dict[str, str]] = []
    seen: set[str] = set()

    await _append_dependency_candidates("fastapi>=0.1", "pyproject", db, candidates, seen)
    await _append_dependency_candidates("fastapi", "pyproject", db, candidates, seen)

    assert len(candidates) == 1
    assert seen == {"fastapi"}


# ── _lookup_build_candidates ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_lookup_build_candidates_reads_both_manifests(tmp_path: Any) -> None:
    (tmp_path / "pyproject.toml").write_text('[project]\ndependencies = ["fastapi"]')
    (tmp_path / "package.json").write_text('{"dependencies": {"react": "^18"}}')
    db = _DB(
        _Result(one=_tech("fastapi", "FastAPI")),
        _Result(),
        _Result(one=_tech("react", "React")),
        _Result(),
    )

    out = await _lookup_build_candidates("./app", tmp_path, db, "svc")

    assert {c["slug"] for c in out} == {"fastapi", "react"}


@pytest.mark.asyncio
async def test_lookup_build_candidates_without_context_returns_empty() -> None:
    assert await _lookup_build_candidates(None, Path("."), object(), "svc") == []


@pytest.mark.asyncio
async def test_lookup_build_candidates_missing_dir_returns_empty(tmp_path: Any) -> None:
    out = await _lookup_build_candidates("./x", tmp_path / "missing", object(), "svc")
    assert out == []


# ── _lookup_technology_candidates ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_lookup_technology_candidates_merges_and_dedups(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.shared.embedding.dependencies.embedding_dependencies.get_embedding_client",
        lambda: SimpleNamespace(embed_text=_embed([1.0, 0.0])),
    )
    db = _DB(
        _Result(one=_tech("loki", "Loki")),
        _Result(),
        _Result(many=(_tech("loki", "Loki", vector=[1.0, 0.0]), _tech("prom", "Prom", vector=[0.99, 0.14]))),
    )

    out = await _lookup_technology_candidates("grafana/loki:3", db, object())

    assert [c["slug"] for c in out] == ["loki", "prom"]  # vector dup dropped


@pytest.mark.asyncio
async def test_lookup_technology_candidates_build_path(tmp_path: Any) -> None:
    (tmp_path / "app").mkdir()
    (tmp_path / "app" / "pyproject.toml").write_text('[project]\ndependencies = ["fastapi"]')
    db = _DB(_Result(one=_tech("fastapi", "FastAPI")), _Result())

    out = await _lookup_technology_candidates(
        None, db, object(), build="./app", project_root=tmp_path, service_name="s"
    )

    assert [c["slug"] for c in out] == ["fastapi"]


@pytest.mark.asyncio
async def test_lookup_technology_candidates_caps(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.shared.embedding.dependencies.embedding_dependencies.get_embedding_client",
        lambda: SimpleNamespace(embed_text=_embed([1.0, 0.0])),
    )
    db = _DB(
        _Result(one=_tech("s0", "n0")),
        _Result(many=(_tech("s1", "n1"), _tech("s2", "n2"))),
        _Result(
            many=(
                _tech("s3", "n3", vector=[1.0, 0.0]),
                _tech("s4", "n4", vector=[1.0, 0.0]),
                _tech("s5", "n5", vector=[1.0, 0.0]),
            )
        ),
    )

    out = await _lookup_technology_candidates("img", db, object())

    assert len(out) == MAX_TECHNOLOGY_CANDIDATES


# ── _collect_service_candidates ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_collect_service_candidates_build_source_returns_dependency_candidates(tmp_path: Any) -> None:
    (tmp_path / "app").mkdir()
    (tmp_path / "app" / "pyproject.toml").write_text('[project]\ndependencies = ["fastapi"]')
    db = _DB(_Result(one=_tech("fastapi", "FastAPI")), _Result())

    out = await _collect_service_candidates({"name": "b", "source": "build", "build": "./app"}, tmp_path, db, object())

    assert [c["slug"] for c in out] == ["fastapi"]


@pytest.mark.asyncio
async def test_collect_service_candidates_image_source_ignores_build(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Any
) -> None:
    (tmp_path / "app").mkdir()
    (tmp_path / "app" / "pyproject.toml").write_text('[project]\ndependencies = ["react"]')
    monkeypatch.setattr(
        "app.shared.embedding.dependencies.embedding_dependencies.get_embedding_client",
        _failing_embedding_client,
    )
    db = _DB(_Result(one=None), _Result(), _Result(one=_tech("react", "React")), _Result())

    out = await _collect_service_candidates(
        {"name": "i", "source": "image", "image": "pg:16", "build": "./app"}, tmp_path, db, object()
    )

    assert out == []  # the build manifest of an image service is never consulted


@pytest.mark.asyncio
async def test_collect_service_candidates_swallows_errors() -> None:
    out = await _collect_service_candidates({"name": "i", "image": "pg"}, Path("."), _DB(), object())
    assert out == []


# ── _stage2_vector_search ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_stage2_vector_search_ranks_above_threshold(monkeypatch: pytest.MonkeyPatch) -> None:
    client = SimpleNamespace(embed_text=_embed([1.0, 0.0]))
    monkeypatch.setattr("app.shared.embedding.dependencies.embedding_dependencies.get_embedding_client", lambda: client)

    near = _tech("near", "Near", vector=[1.0, 0.0])
    far = _tech("far", "Far", vector=[0.0, 1.0])  # cosine 0 → below threshold
    db = _DB(_Result(many=(near, far)))

    out = await _stage2_vector_search("q", db, object())
    assert [c["slug"] for c in out] == ["near"]


@pytest.mark.asyncio
async def test_stage2_vector_search_returns_empty_on_embedding_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.shared.embedding.dependencies.embedding_dependencies.get_embedding_client",
        _failing_embedding_client,
    )

    assert await _stage2_vector_search("q", _DB(), object()) == []
