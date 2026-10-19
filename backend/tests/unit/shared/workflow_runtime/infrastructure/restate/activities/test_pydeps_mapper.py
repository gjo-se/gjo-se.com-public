"""Unit tests for the pydeps mapper (`pydeps_mapper`).

Covers:
- `_top_level` component-key derivation (deterministic level-3 collapse under
  `app.core` / `app.gjo_se_com` / `app.api`; entry buckets keep themselves)
- Namespace-root filtering in `map_pydeps_output`
- Canonical `modules[]` entry shape (keys, dedup, sort, deterministic order)
- Container→repo path conversion (`_repo_relative_path`)
"""

from __future__ import annotations

from typing import Any

import pytest

from app.shared.workflow_runtime.infrastructure.restate.activities.pydeps_mapper import (
    _EXCLUDED_COMPONENT_KEYS,
    _NAMESPACE_ROOTS,
    _repo_relative_path,
    _top_level,
    map_pydeps_output,
)

# ── _top_level ──────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("module_name", "expected"),
    [
        # core-Feature-Keys (3 Segmente unter app.core)
        ("app.core.llm", "app.core.llm"),
        ("app.core.llm.client.client", "app.core.llm"),
        ("app.core.auth.router.auth_router", "app.core.auth"),
        # tasks ist ein flacher Namespace-Container auf Ebene 3 → Kollaps auf
        # app.core.tasks (restate/router sind INHALT, keine eigenen Components).
        ("app.core.tasks", "app.core.tasks"),
        ("app.core.tasks.restate", "app.core.tasks"),
        ("app.core.tasks.restate.activities.scan", "app.core.tasks"),
        ("app.core.tasks.router", "app.core.tasks"),
        # gjo_se_com-Feature-Keys (3 Segmente unter app.gjo_se_com)
        ("app.gjo_se_com.fbf", "app.gjo_se_com.fbf"),
        ("app.gjo_se_com.fbf.router.skill_router", "app.gjo_se_com.fbf"),
        ("app.gjo_se_com.crm.services.crm_service", "app.gjo_se_com.crm"),
        # app.api-Root → eigener Level-3-Key (app.api.v1), nicht Aggregator app.api
        ("app.api.v1", "app.api.v1"),
        ("app.api.v1.routers.dev", "app.api.v1"),
        # Entry-Module: eigener Bucket
        ("app.main", "app.main"),
        ("app.worker_app", "app.worker_app"),
    ],
)
def test_top_level_derives_component_key(module_name: str, expected: str) -> None:
    """Each dotted module name maps to the documented level-3 component key."""
    assert _top_level(module_name) == expected


# ── Namespace-Root-Filter ───────────────────────────────────────────────────


def test_namespace_roots_are_not_modules() -> None:
    """Empty container roots are excluded from ``modules[]``."""
    assert "app" in _NAMESPACE_ROOTS
    assert "app.core" in _NAMESPACE_ROOTS
    assert "app.gjo_se_com" in _NAMESPACE_ROOTS
    assert "app.api" in _NAMESPACE_ROOTS


def test_map_pydeps_output_filters_namespace_roots() -> None:
    """Pure namespace roots never appear as module entries."""
    raw: dict[str, Any] = {
        "app.core": {"path": "/app/app/core/__init__.py", "imports": []},
        "app.gjo_se_com": {"path": "/app/app/gjo_se_com/__init__.py", "imports": []},
        "app.api": {"path": "/app/app/api/__init__.py", "imports": []},
        "app": {"path": "/app/app/__init__.py", "imports": []},
        "app.core.llm": {"path": "/app/app/core/llm/__init__.py", "imports": ["app.core"]},
    }
    modules = map_pydeps_output(raw)
    names = [m["name"] for m in modules]
    assert "app.core" not in names
    assert "app.gjo_se_com" not in names
    assert "app.api" not in names
    assert "app" not in names
    # the real level-3 module survives
    assert "app.core.llm" in names


# ── Excluded component keys (backend-L3 wiring rule) ────────────────────────


def test_excluded_component_keys_are_dropped_from_modules() -> None:
    """Container entry/wiring modules never become L3 component nodes.

    ``app.main`` (API process), ``app.worker_app`` (Restate worker) and the
    ``app.api.v1`` HTTP composition root are the container's own surface, not
    building blocks *inside* it — they are excluded from ``modules[]``.
    """
    raw: dict[str, Any] = {
        "app.main": {"path": "/app/app/main.py", "imports": ["app.api.v1.router", "app.core"]},
        "app.worker_app": {"path": "/app/app/worker_app.py", "imports": ["app.core.tasks"]},
        "app.api.v1": {"path": "/app/app/api/v1/__init__.py", "imports": []},
        "app.api.v1.router": {"path": "/app/app/api/v1/router.py", "imports": ["app.gjo_se_com"]},
        "app.api.v1.routers.health": {"path": "/app/app/api/v1/routers/health.py", "imports": []},
        "app.gjo_se_com.fbf.router.skill_router": {
            "path": "/app/app/gjo_se_com/fbf/router/skill_router.py",
            "imports": ["app.core.llm"],
        },
    }
    names = [m["name"] for m in map_pydeps_output(raw)]
    assert "app.main" not in names
    assert "app.worker_app" not in names
    assert "app.api.v1" not in names
    assert "app.api.v1.router" not in names
    assert "app.api.v1.routers.health" not in names
    # real L3 component survives
    assert "app.gjo_se_com.fbf.router.skill_router" in names
    # the exclusion set contains exactly the three wiring surfaces
    assert {"app.main", "app.worker_app", "app.api.v1"} == _EXCLUDED_COMPONENT_KEYS


# ── Kanonisches modules[]-Schema ────────────────────────────────────────────


def test_module_entry_shape_and_determinism() -> None:
    """Every entry has exactly name/path/imports/top_level; imports dedup+sort."""
    raw: dict[str, Any] = {
        "app.core.auth.router.auth_router": {
            "path": "/app/app/core/auth/router/auth_router.py",
            "imports": ["app.gjo_se_com.fbf", "app.core.db", "app.core.db"],
        },
        "app.gjo_se_com.fbf.router.skill_router": {
            "path": "/app/app/gjo_se_com/fbf/router/skill_router.py",
            "imports": ["app.core.llm"],
        },
    }
    modules = map_pydeps_output(raw)
    # sorted by name → byte-identical across runs
    assert [m["name"] for m in modules] == [
        "app.core.auth.router.auth_router",
        "app.gjo_se_com.fbf.router.skill_router",
    ]
    router = modules[0]
    assert router["path"] == "backend/app/core/auth/router/auth_router.py"
    assert router["imports"] == ["app.core.db", "app.gjo_se_com.fbf"]  # dedup + sort
    assert router["top_level"] == "app.core.auth"
    assert set(router.keys()) == {"name", "path", "imports", "top_level"}


def test_map_pydeps_output_collapses_tasks_restate_into_tasks() -> None:
    """Modules below the flat namespace ``app.core.tasks`` share its top_level."""
    raw: dict[str, Any] = {
        "app.core.tasks": {"path": "/app/app/core/tasks/__init__.py", "imports": []},
        "app.core.tasks.restate": {
            "path": "/app/app/core/tasks/restate/__init__.py",
            "imports": ["app.core.tasks"],
        },
        "app.core.tasks.restate.activities.worker": {
            "path": "/app/app/core/tasks/restate/activities/worker.py",
            "imports": ["app.core.tasks.restate"],
        },
        "app.core.tasks.router": {
            "path": "/app/app/core/tasks/router.py",
            "imports": ["app.core.tasks"],
        },
    }
    modules = map_pydeps_output(raw)
    tops = {m["top_level"] for m in modules}
    assert tops == {"app.core.tasks"}


# ── _repo_relative_path ─────────────────────────────────────────────────────


def test_repo_relative_path() -> None:
    """Container path → repo-relative ``backend/app/...`` path."""
    assert _repo_relative_path("/app/app/core/llm/client.py") == "backend/app/core/llm/client.py"
    assert _repo_relative_path("/repo/backend/app/core/llm/client.py") == "backend/app/core/llm/client.py"
    assert _repo_relative_path("core/llm/client.py") == "backend/app/core/llm/client.py"
