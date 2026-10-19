"""Restate activity that runs pydeps on the backend and persists module imports.

Executes the pydeps CLI (bytecode import analysis, deterministic, no code
execution) against ``backend/app``, normalizes the raw JSON at the engine
boundary via ``pydeps_mapper.map_pydeps_output`` into the canonical
``modules[]`` schema, and persists it deterministically into
``architecture/_pipeline/imports/backend.json`` under the ``"backend"`` key.

The mapper layer keeps the scanner engine swappable.
"""

from __future__ import annotations

import asyncio
import json
import subprocess
from pathlib import Path
from typing import Any

import structlog
from restate import Context, Service

from app.shared.workflow_runtime.infrastructure.restate.activities.pydeps_mapper import map_pydeps_output
from app.viscera.repositories.file.architecture_repository import ArchitectureStore

logger = structlog.get_logger(__name__)

pydeps_service = Service("PydepsActivity")

# Backend root (``…/backend``) – the dir that contains the ``app`` package.
# Derived file-relative, so it works in the repo-root container mount
# (``/repo/backend``) as well as on the host.
_BACKEND_ROOT = Path(__file__).resolve().parents[3]


@pydeps_service.handler()
async def run(ctx: Context, arg: dict[str, Any]) -> dict[str, Any]:
    """Run pydeps on the backend and persist the canonical ``modules[]``.

    Args:
        ctx: Restate context.
        arg: Optional dict (reserved for future options).

    Returns:
        Dict with ``ok`` and ``modules_found`` keys on success, or
        ``ok: False`` with ``error`` on failure.
    """
    logger.info("PydepsActivity: running pydeps on backend/app")

    try:
        # cwd = backend root (code under ``<root>/app``); pydeps analyses the
        # ``app`` package relative to it.
        # --show-deps prints the dependency analysis JSON to stdout;
        # --only app keeps only app-internal import edges;
        # --no-output prevents any Graphviz rendering (not installed).
        result = await asyncio.to_thread(
            subprocess.run,
            ["pydeps", "--show-deps", "--only", "app", "--no-output", "app"],
            cwd=str(_BACKEND_ROOT),
            capture_output=True,
            text=True,
            timeout=300,  # 5 minutes for large codebases
            check=False,
        )

        if result.returncode != 0:
            error_msg = result.stderr.strip() or "pydeps exited with non-zero code"
            logger.error(
                "PydepsActivity: subprocess failed (rc=%d): %s",
                result.returncode,
                error_msg,
            )
            return {"ok": False, "error": error_msg}

        try:
            raw = json.loads(result.stdout)
        except json.JSONDecodeError as exc:
            logger.error("PydepsActivity: invalid JSON output: %s", exc)
            return {"ok": False, "error": f"Invalid JSON: {exc}"}

        modules = map_pydeps_output(raw)

        # ── Deterministic persistence (whole-file, own source file) ─────
        imports_path = ArchitectureStore().root() / "_pipeline" / "imports" / "backend.json"
        imports_path.parent.mkdir(parents=True, exist_ok=True)
        imports_path.write_text(json.dumps({"backend": {"modules": modules}}, indent=2) + "\n", encoding="utf-8")

        modules_found = len(modules)
        logger.info(
            "PydepsActivity: wrote %d backend modules to %s",
            modules_found,
            imports_path,
        )

        return {"ok": True, "modules_found": modules_found}

    except subprocess.TimeoutExpired:
        logger.error("PydepsActivity: subprocess timed out after 300s")
        return {"ok": False, "error": "pydeps timed out after 300s"}
    except FileNotFoundError:
        logger.error("PydepsActivity: pydeps executable not found")
        return {"ok": False, "error": "pydeps executable not found – is it installed?"}
    except Exception:
        logger.exception("PydepsActivity: unexpected error")
        return {"ok": False, "error": "Unexpected error during pydeps analysis"}
