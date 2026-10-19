"""On-demand LLM node-description generation for derived L3/L4 nodes.

Generates a concise LLM summary for a single node from its module docstrings.
The endpoint is **read-only** – it never writes to ``nodes/`` or ``diagrams/``;
persisting the result is exclusively the FE's job (diagram sync path).

Node resolution (L3 == L4, one code path):
- ``node_id`` is a module ``name`` (L4 file/module) → its **own** docstring is
  used → summary "was das Modul ist".
- ``node_id`` is a ``top_level`` (L3 component) → the **child-module** docstrings
  are used → summary "was die Component beinhaltet".

An LLM failure (NoModel, Circuit, Timeout, ``success=False``) is a graceful skip
(``skipped=True`` + ``reason``) – never a hard 5xx for the user (Plan-Vorgabe).
The docstring collection is the single shared implementation (DRY) that the
former ``llm_enrichment_activity`` L3/L4 phase used; the pipeline auto-generate
phase has been removed in favour of this on-demand path.
"""

from __future__ import annotations

import ast
import json
from pathlib import Path
from typing import Any

import structlog

from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_task_executor_service
from app.viscera.repositories.file.architecture_repository import resolve_architecture_dir
from app.viscera.repositories.node_summary_repository import open_session as open_node_summary_session
from app.viscera.schemas.enrichment_schemas import ComponentSummaryOut

logger = structlog.get_logger(__name__)

_MAX_DOCSTRING_CHARS = 2000
"""Maximum number of characters kept per collected module docstring."""


def _read_module_docstring(arch_root: Path, module: dict[str, Any]) -> str | None:
    """Read and parse the module docstring of a single module entry.

    Resolves the repo-relative module ``path`` (``backend/app/...``) against
    the architecture root and extracts the docstring via ``ast``. The source
    is looked up at the host layout (``arch_root / ".." / path``) and, as a
    fallback, at the container layout (``cwd / path`` with the ``backend/``
    prefix stripped), so both environments resolve the module files.

    Args:
        arch_root: Resolved ``architecture/`` directory.
        module: Canonical module entry (``name``, ``path``).

    Returns:
        The module docstring, or ``None`` if it is missing/empty.
    """
    module_path = str(module.get("path", ""))
    source_paths = [
        arch_root / ".." / module_path,
        Path.cwd() / module_path.removeprefix("backend/"),
    ]
    source: str | None = None
    for source_path in source_paths:
        if not source_path.is_file():
            continue
        try:
            source = source_path.read_text(encoding="utf-8")
            break
        except (OSError, UnicodeDecodeError) as exc:
            logger.warning("OnDemandNodeSummary: cannot read module %s: %s", module_path, exc)
            return None
    if source is None:
        logger.warning("OnDemandNodeSummary: module source not found for %s", module_path)
        return None
    try:
        tree = ast.parse(source)
    except SyntaxError as exc:
        logger.warning("OnDemandNodeSummary: cannot parse module %s: %s", module_path, exc)
        return None
    docstring = ast.get_docstring(tree)
    if not docstring:
        return None
    return docstring.strip()


def _load_backend_modules(arch_root: Path) -> list[dict[str, Any]]:
    """Load the canonical ``backend.modules[]`` list from ``imports/backend.json``."""
    imports_path = arch_root / "_pipeline" / "imports" / "backend.json"
    if not imports_path.is_file():
        logger.info("OnDemandNodeSummary: imports/backend.json not found")
        return []
    try:
        backend_imports = json.loads(imports_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("OnDemandNodeSummary: could not read imports/backend.json: %s", exc)
        return []
    modules = (backend_imports.get("backend") or {}).get("modules", [])
    if not isinstance(modules, list):
        logger.info("OnDemandNodeSummary: no backend modules section")
        return []
    return [m for m in modules if isinstance(m, dict)]


def collect_node_docstrings(arch_root: Path, node_id: str) -> list[str]:
    """Collect the docstrings used to summarize a single node.

    Resolution (L3 == L4, one code path):
    - ``node_id`` is a ``top_level`` (L3) → the docstrings of all child modules
      (sorted by name) are collected → summary "was die Component beinhaltet".
    - otherwise ``node_id`` is a module ``name`` (L4) → its **own** docstring is
      used → summary "was das Modul ist".

    A ``top_level`` always also exists as a module ``name`` (its ``__init__``),
    so the ``top_level`` branch is checked first to honour the L3 semantics.
    Each docstring is truncated to ``_MAX_DOCSTRING_CHARS``.

    Args:
        arch_root: Resolved ``architecture/`` directory.
        node_id: ``top_level`` (L3) or module ``name`` (L4).

    Returns:
        List of collected docstrings (empty when no module resolves).
    """
    modules = _load_backend_modules(arch_root)
    if not modules:
        return []

    # L3: node_id is a top_level → collect child-module docstrings.
    group = [m for m in modules if m.get("top_level") == node_id]
    if group:
        group.sort(key=lambda module: str(module.get("name", "")))
        docstrings: list[str] = []
        for module in group:
            docstring = _read_module_docstring(arch_root, module)
            if docstring:
                docstrings.append(docstring[:_MAX_DOCSTRING_CHARS])
        return docstrings

    # L4: node_id is a module name → use its own docstring.
    for module in modules:
        if module.get("name") == node_id:
            docstring = _read_module_docstring(arch_root, module)
            if docstring:
                return [docstring[:_MAX_DOCSTRING_CHARS]]
            return []

    return []


def node_exists(arch_root: Path, node_id: str) -> bool:
    """Check whether ``node_id`` is a known ``top_level`` or module ``name``.

    Used by the router to reject unknown node ids with a 404. Mirrors the
    node-resolution in :func:`collect_node_docstrings`.
    """
    modules = _load_backend_modules(arch_root)
    return any(module.get("name") == node_id or module.get("top_level") == node_id for module in modules)


def _parse_description(llm_output: object, node_id: str) -> str | None:
    """Extract the summary for ``node_id`` from the ``component-summary`` output.

    Tolerates both a dict and a ``ComponentSummaryOut`` instance. Matches by
    ``id`` first, then falls back to the first non-empty entry (the request sends
    exactly one component).
    """
    if isinstance(llm_output, ComponentSummaryOut):
        parsed = llm_output
    elif isinstance(llm_output, dict):
        try:
            parsed = ComponentSummaryOut.model_validate(llm_output)
        except Exception:
            logger.exception("OnDemandNodeSummary: failed to parse summary output")
            return None
    else:
        return None

    for item in parsed.components:
        if item.id == node_id and item.description.strip():
            return item.description
    for item in parsed.components:
        if item.description.strip():
            return item.description
    return None


async def generate_node_summary(node_id: str, trigger: str) -> dict[str, Any]:
    """Generate the on-demand LLM summary for a single node.

    Collects the node docstrings, runs the ``component-summary`` task and
    returns the generated description. Never writes files. An LLM failure or a
    missing docstring is a graceful skip (``skipped=True``).

    Args:
        node_id: ``top_level`` (L3) or module ``name`` (L4).
        trigger: Langfuse-tracing trigger label.

    Returns:
        Dict with ``node_id``, ``description``, ``skipped`` and ``reason``.
    """
    arch_root = resolve_architecture_dir()
    docstrings = collect_node_docstrings(arch_root, node_id)
    if not docstrings:
        logger.info("OnDemandNodeSummary: no docstrings for node %s", node_id)
        return {"node_id": node_id, "description": None, "skipped": True, "reason": "no_docstrings"}

    variables = {
        "components": json.dumps(
            [{"id": node_id, "name": node_id, "docstrings": docstrings}],
            ensure_ascii=False,
        )
    }
    try:
        async with open_node_summary_session() as core_db:
            llm_result = await get_task_executor_service().execute_task(
                db=core_db,
                task_key="component-summary",
                variables=variables,
                trigger=trigger,
            )
    except Exception as exc:
        logger.exception(
            "OnDemandNodeSummary skipped for %s: LLM call failed",
            node_id,
        )
        return {"node_id": node_id, "description": None, "skipped": True, "reason": str(exc)}

    if not llm_result.get("success"):
        error_type = llm_result.get("error_type", "unknown")
        logger.warning(
            "OnDemandNodeSummary skipped for %s: LLM unavailable (error_type=%s)",
            node_id,
            error_type,
        )
        return {"node_id": node_id, "description": None, "skipped": True, "reason": error_type}

    llm_output = llm_result.get("result")
    if llm_output is None:
        logger.warning("OnDemandNodeSummary skipped for %s: LLM returned no result", node_id)
        return {"node_id": node_id, "description": None, "skipped": True, "reason": "no_result"}

    description = _parse_description(llm_output, node_id)
    if not description:
        return {"node_id": node_id, "description": None, "skipped": True, "reason": "no_summary"}

    return {"node_id": node_id, "description": description, "skipped": False, "reason": None}
