"""Unit tests for DockerComposeParserActivity.

Covers:
- Successful parse with 3 services (1 build, 1 image, 1 DB)
- build service → source: "build"
- image service → source: "image"
- Missing docker-compose.yml → ok: False with error
- Merge override overwrites base values correctly
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from app.viscera.activities import docker_compose_parser_activity as activity
from app.viscera.activities.docker_compose_parser_activity import (
    _deep_merge,
    _extract_service,
    _load_yaml,
    _resolve_project_root,
    run,
)


class TestExtractService:
    """Unit tests for _extract_service helper."""

    def test_build_service_gets_source_build(self) -> None:
        """A service with a ``build`` key gets ``source: "build"``."""
        svc: dict[str, Any] = {
            "build": ".",
            "ports": ["8000:8000"],
            "depends_on": {"db": {"condition": "service_healthy"}},
            "logging": {"driver": "loki"},
            "command": "uvicorn app.main:app",
        }

        result = _extract_service("app", svc)

        assert result["name"] == "app"
        assert result["source"] == "build"
        assert result["build"] == "."
        assert result["ports"] == ["8000:8000"]
        assert result["depends_on"] == {"db": {"condition": "service_healthy"}}
        assert result["logging"] == {"driver": "loki"}
        assert result["command"] == "uvicorn app.main:app"

    def test_image_service_gets_source_image(self) -> None:
        """A service with an ``image`` key gets ``source: "image"``."""
        svc: dict[str, Any] = {
            "image": "nginx:alpine",
            "ports": ["80:80"],
        }

        result = _extract_service("web", svc)

        assert result["name"] == "web"
        assert result["source"] == "image"
        assert result["image"] == "nginx:alpine"
        assert result["ports"] == ["80:80"]
        assert "build" not in result

    def test_build_as_dict_is_preserved(self) -> None:
        """A ``build`` key with a dict value is passed through as-is."""
        svc: dict[str, Any] = {
            "build": {"context": "./app", "dockerfile": "Dockerfile.dev"},
        }

        result = _extract_service("custom", svc)

        assert result["source"] == "build"
        assert result["build"] == {"context": "./app", "dockerfile": "Dockerfile.dev"}

    def test_build_takes_precedence_over_image(self) -> None:
        """When both ``build`` and ``image`` are present, ``build`` wins."""
        svc: dict[str, Any] = {
            "build": ".",
            "image": "some-image:latest",
        }

        result = _extract_service("dual", svc)

        assert result["source"] == "build"
        assert "image" not in result

    def test_minimal_service_no_optional_fields(self) -> None:
        """A service with only build/image and no optional fields."""
        svc: dict[str, Any] = {"image": "alpine:latest"}

        result = _extract_service("minimal", svc)

        assert result["name"] == "minimal"
        assert result["source"] == "image"
        assert "ports" not in result
        assert "depends_on" not in result
        assert "logging" not in result
        assert "command" not in result

    def test_depends_on_list_is_preserved(self) -> None:
        """``depends_on`` as a list of strings is preserved."""
        svc: dict[str, Any] = {
            "image": "app:latest",
            "depends_on": ["db", "redis"],
        }

        result = _extract_service("svc", svc)

        assert result["depends_on"] == ["db", "redis"]


FIXTURES_DIR = Path(__file__).resolve().parents[5] / "fixtures"


def _read_fixture(name: str) -> dict[str, Any]:
    """Load a YAML fixture file and return it as a dict."""
    from ruamel.yaml import YAML

    yaml_parser = YAML(typ="safe")
    filepath = FIXTURES_DIR / name
    if not filepath.is_file():
        return {}
    with open(str(filepath), encoding="utf-8") as fh:
        data = yaml_parser.load(fh)
        return data if isinstance(data, dict) else {}


class TestRunHandler:
    """Integration-style tests for the ``run`` handler with mocked file paths."""

    @pytest.fixture
    def mock_base(self) -> dict[str, Any]:
        return _read_fixture("mock_docker_compose.yml")

    @pytest.fixture
    def mock_override(self) -> dict[str, Any]:
        return _read_fixture("mock_docker_compose_override.yml")

    @pytest.fixture(autouse=True)
    def _cleanup_actual_imports(self) -> None:
        """Ensure no stale actual_imports.json between tests."""
        actual_imports_path = FIXTURES_DIR / "_pipeline" / "actual_imports.json"
        actual_imports_path.unlink(missing_ok=True)

    def test_missing_docker_compose_returns_error(self) -> None:
        """When docker-compose.yml does not exist, return ``ok: False`` with error."""
        ctx = MagicMock()
        non_existent_dir = Path("/tmp/nonexistent-dir-12345")

        with patch(
            "app.viscera.activities.docker_compose_parser_activity._resolve_project_root",
            return_value=non_existent_dir,
        ):
            result = asyncio.run(run(ctx, {}))

        assert result["ok"] is False
        assert "error" in result
        assert "not found" in result["error"]


class TestResolveProjectRoot:
    """Tests for _resolve_project_root."""

    def test_returns_cwd_when_it_contains_compose(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        """The cwd is preferred when it holds a docker-compose.yml."""
        (tmp_path / "docker-compose.yml").write_text("services: {}\n", encoding="utf-8")
        monkeypatch.setattr(Path, "cwd", staticmethod(lambda: tmp_path))

        assert _resolve_project_root() == tmp_path

    def test_falls_back_to_architecture_parent(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        """Without a compose file the architecture dir's parent is used."""
        cwd = tmp_path / "cwd"
        cwd.mkdir()
        arch = tmp_path / "arch"
        arch.mkdir()
        monkeypatch.setattr(Path, "cwd", staticmethod(lambda: cwd))
        monkeypatch.setattr(activity, "ArchitectureStore", lambda: SimpleNamespace(root=lambda: arch))

        assert _resolve_project_root() == arch.parent


class TestLoadYaml:
    """Tests for _load_yaml."""

    def test_returns_empty_for_missing_file(self, tmp_path: Path) -> None:
        """A missing file yields an empty dict."""
        assert _load_yaml(tmp_path / "nope.yml") == {}

    def test_returns_empty_for_non_dict_document(self, tmp_path: Path) -> None:
        """A YAML document that is not a mapping yields an empty dict."""
        filepath = tmp_path / "list.yml"
        filepath.write_text("- 1\n- 2\n", encoding="utf-8")

        assert _load_yaml(filepath) == {}

    def test_returns_dict_for_mapping(self, tmp_path: Path) -> None:
        """A mapping document is returned as-is."""
        filepath = tmp_path / "ok.yml"
        filepath.write_text("services:\n  app:\n    image: alpine\n", encoding="utf-8")

        assert _load_yaml(filepath) == {"services": {"app": {"image": "alpine"}}}


def test_deep_merge_updates_top_level_keys() -> None:
    """Override keys replace base keys; untouched base keys are preserved."""
    base: dict[str, Any] = {"image": "a", "ports": ["1:1"], "command": "old"}
    _deep_merge(base, {"command": "new", "extra": 1})

    assert base == {"image": "a", "ports": ["1:1"], "command": "new", "extra": 1}


class TestRunHandlerHappyPath:
    """The run handler with a fully mocked project root and architecture store."""

    def test_run_writes_docker_json_with_merged_services(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        """Base + override + langfuse services are written to imports/docker.json."""
        (tmp_path / "docker-compose.yml").write_text(
            "services:\n  app:\n    build: .\n    ports: ['8000:8000']\n  db:\n    image: postgres:16\n",
            encoding="utf-8",
        )
        (tmp_path / "docker-compose.override.yml").write_text(
            "services:\n  app:\n    command: uvicorn\n  extra:\n    image: redis:7\n",
            encoding="utf-8",
        )
        (tmp_path / "docker-compose.langfuse.yml").write_text(
            "services:\n  langfuse:\n    image: langfuse/langfuse:2\n",
            encoding="utf-8",
        )
        arch = tmp_path / "architecture"
        arch.mkdir()
        monkeypatch.chdir(tmp_path)  # cwd holds the compose files → real root resolution
        monkeypatch.setattr(activity, "ArchitectureStore", lambda: SimpleNamespace(root=lambda: arch))

        result = asyncio.run(run(MagicMock(), {}))

        assert result == {"ok": True, "services_found": 4}
        written = json.loads((arch / "_pipeline" / "imports" / "docker.json").read_text(encoding="utf-8"))
        by_name = {svc["name"]: svc for svc in written["docker"]}
        assert set(by_name) == {"app", "db", "extra", "langfuse"}
        assert by_name["app"]["command"] == "uvicorn"
        assert by_name["app"]["source"] == "build"
        assert by_name["db"]["source"] == "image"
        assert by_name["langfuse"]["image"] == "langfuse/langfuse:2"
