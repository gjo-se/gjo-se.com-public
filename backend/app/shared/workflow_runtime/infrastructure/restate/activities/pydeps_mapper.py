"""Mapping layer from raw pydeps JSON to the canonical ``modules[]`` schema.

Pure functions without I/O — the engine output is normalized at the boundary
so that the scanner engine stays swappable (plan decision). The canonical
module entry is ``{name, path, imports, top_level}``.

Component boundaries are derived deterministically from the dotted module
name: **everything from level 3 (the third path segment) under the namespace
roots ``app.core`` / ``app.gjo_se_com`` / ``app.api`` is one Component** — the
module's ``top_level`` is its 3-segment prefix. This replaces the earlier
package-tree heuristics (depth-based grouping detection), which produced
unstable boundaries for flat namespace containers like ``app.shared.workflow_runtime``
(its ``restate``/``router`` sub-packages used to become their own top_level
nodes instead of collapsing onto ``app.shared.workflow_runtime``).

The reserved namespace roots (``app``, ``app.core``, ``app.gjo_se_com``,
``app.api``) are excluded from ``modules[]`` so they neither become their own
component node nor leak parent-import noise into the L3 graph. A curated
include-list override (module name → forced component key) wins over the
deterministic rule — the escape hatch for future design decisions without
reintroducing heuristics.

Container entry/wiring modules (``app.main`` / ``app.worker_app``) and the
HTTP composition root (``app.api.v1``) are **not** L3 components: they are the
container's own process/routing surface, not architectural building blocks
*inside* the backend container (backend-L3 modeling rule). They are excluded
by their derived component key (``_EXCLUDED_COMPONENT_KEYS``) so they never
become component nodes nor leak import edges into the L3 graph.

Raw pydeps output (``--show-deps`` / ``--deps-output``) is a mapping of
dotted module name to a dict with keys like ``bacon``, ``imported_by``,
``name``, ``path`` and ``imports``. Only the ``app.*`` modules are present
because pydeps is invoked with ``--only app``.
"""

from __future__ import annotations

from typing import Any

# Marker separating the app-package root from the module path. pydeps reports
# absolute paths, so the module path is whatever follows the last ``/app/`` —
# this works for both ``/app/app/...`` (legacy) and ``/repo/backend/app/...``
# (repo-root mount).
_APP_MARKER = "/app/"

# Pure namespace roots (empty container ``__init__.py``) that are not real
# modules. Excluded from ``modules[]`` so they neither become their own
# component node nor leak parent-import noise into the L3 graph.
_NAMESPACE_ROOTS = frozenset({"app", "app.core", "app.gjo_se_com", "app.api"})

# Depth-2 namespace roots under which every level-3 package is a Component.
_DEPTH2_ROOTS = frozenset({"app.core", "app.gjo_se_com", "app.api"})

# Number of leading segments kept for the Component key under a depth-2 root
# (``app.shared.llm_gateway``, ``app.fbf``, ``app.api.v1``).
_COMPONENT_DEPTH = 3

# Curated include-list override (module name -> forced component key). Documented
# exception for features the deterministic level-3 rule misses — explicitly NOT
# an exclusion list. Applied after the level-3 rule (override wins).
_MANUAL_COMPONENT_OVERRIDES: dict[str, str] = {}

# Component keys that must never become L3 nodes (backend-L3 modeling rule).
# These are the container's own entry/wiring surface — the API process
# (``app.main``), the Restate worker process (``app.worker_app``) and the HTTP
# composition root (``app.api.v1``) — i.e. *the container itself*, not building
# blocks *inside* it. Modules mapping to these keys are dropped from
# ``modules[]`` so they neither become component nodes nor leak import edges
# into the L3 component diagram.
_EXCLUDED_COMPONENT_KEYS = frozenset({"app.main", "app.worker_app", "app.api.v1"})


def _repo_relative_path(raw_path: str) -> str:
    """Convert a container path to a repo-relative ``backend/app/...`` path.

    Args:
        raw_path: Module path as reported by pydeps; either absolute
            (``/repo/backend/app/...`` or ``/app/app/...``) or relative to the
            app package (``core/llm/client.py``).

    Returns:
        Repo-relative path prefixed with ``backend/app``.
    """
    idx = raw_path.rfind(_APP_MARKER)
    if idx != -1:
        return "backend/app/" + raw_path[idx + len(_APP_MARKER) :]
    return "backend/app/" + raw_path.lstrip("/")


def _top_level(module_name: str) -> str:
    """Derive the Component key (top_level) from a dotted module name.

    Deterministic rule — no package-tree heuristics:
    1. Under a depth-2 namespace root (``app.core`` / ``app.gjo_se_com`` /
       ``app.api``) → the 3-segment prefix (``app.shared.workflow_runtime.infrastructure.restate`` and
       ``app.shared.workflow_runtime.infrastructure.restate.activities.x`` both collapse onto
        ``app.shared.workflow_runtime``).
    2. Anything else (``app.main``, ``app.worker_app``) → the module name
       itself (own clearly-named entry bucket).

    A curated override from :data:`_MANUAL_COMPONENT_OVERRIDES` always wins.
    Components whose key is in :data:`_EXCLUDED_COMPONENT_KEYS` are dropped
    downstream (they never become L3 nodes).

    Args:
        module_name: Full dotted module name (e.g. ``app.shared.llm_gateway.client.client``).

    Returns:
        Component key for the ``top_level`` field.
    """
    override = _MANUAL_COMPONENT_OVERRIDES.get(module_name)
    if override is not None:
        return override
    parts = module_name.split(".")
    if len(parts) >= _COMPONENT_DEPTH and ".".join(parts[:2]) in _DEPTH2_ROOTS:
        return ".".join(parts[:_COMPONENT_DEPTH])
    return module_name


def map_pydeps_output(raw: dict[str, Any]) -> list[dict[str, Any]]:
    """Map raw pydeps JSON to the canonical ``modules[]`` schema.

    Produces exactly one entry per module with the keys ``name``, ``path``,
    ``imports``, ``top_level`` in this order. Import lists are deduplicated
    and alphabetically sorted. The returned module list is sorted by
    ``name`` to enable byte-identical runs.

    Pure namespace roots (``_NAMESPACE_ROOTS``) are excluded — they are empty
    container ``__init__.py`` files, not real modules, and would otherwise
    create a fake component node plus parent-import noise in the L3 graph.
    Level-3 Component packages stay (e.g. ``app.shared.workflow_runtime``), while modules
    whose component key is in ``_EXCLUDED_COMPONENT_KEYS`` (``app.main``,
    ``app.worker_app``, ``app.api.v1``) are dropped — the container's own
    entry/wiring surface, not L3 building blocks.

    Args:
        raw: Raw pydeps dependency analysis (module name → metadata dict).

    Returns:
        Sorted list of canonical module entries.
    """
    modules: list[dict[str, Any]] = []
    for name, meta in raw.items():
        if not isinstance(meta, dict):
            continue
        if name in _NAMESPACE_ROOTS:
            continue
        top_level = _top_level(name)
        if top_level in _EXCLUDED_COMPONENT_KEYS:
            continue
        raw_imports = meta.get("imports", [])
        imports = sorted({str(item) for item in raw_imports}) if isinstance(raw_imports, list) else []
        raw_path = str(meta.get("path", ""))
        modules.append(
            {
                "name": name,
                "path": _repo_relative_path(raw_path),
                "imports": imports,
                "top_level": top_level,
            }
        )
    modules.sort(key=lambda entry: entry["name"])
    return modules
