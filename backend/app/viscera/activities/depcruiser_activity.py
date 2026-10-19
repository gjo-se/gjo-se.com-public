"""Restate activity for dependency-cruiser frontend dependency analysis.

Runs ``npx dependency-cruiser`` via subprocess to extract the import
graph from the frontend TypeScript/JavaScript codebase. Output is a
JSON fragment written to ``architecture/_pipeline/imports/frontend.json``
(``frontend`` section).
"""

from __future__ import annotations

import asyncio
import json
import subprocess
from typing import Any

import structlog
from restate import Context, Service

from app.viscera.repositories.file.architecture_repository import ArchitectureStore

logger = structlog.get_logger(__name__)

depcruiser_service = Service("DepCruiserActivity")


@depcruiser_service.handler()
async def run(ctx: Context, arg: dict[str, Any]) -> dict[str, Any]:
    """Execute dependency-cruiser on the frontend codebase.

    Args:
        ctx: Restate context.
        arg: Dict with optional ``include_only`` key
             (default ``"^frontend/src"``).

    Returns:
        Dict with ``frontend`` key containing the parsed JSON fragment,
        or ``error`` key on failure.
    """
    include_only: str = arg.get("include_only", "^frontend/src")

    logger.info("DepCruiserActivity: analysing frontend (include=%s)", include_only)

    try:
        result = await asyncio.to_thread(
            subprocess.run,
            [
                "npx",
                "dependency-cruiser",
                "--output-type",
                "json",
                "--include-only",
                include_only,
            ],
            capture_output=True,
            text=True,
            timeout=300,  # 5 minutes for large frontends
            check=False,
        )

        if result.returncode != 0:
            error_msg = result.stderr.strip() or "dependency-cruiser exited with non-zero code"
            logger.error(
                "DepCruiserActivity: subprocess failed (rc=%d): %s",
                result.returncode,
                error_msg,
            )
            return {"ok": False, "error": error_msg}

        try:
            data = json.loads(result.stdout)
        except json.JSONDecodeError as exc:
            logger.error("DepCruiserActivity: invalid JSON output: %s", exc)
            return {"ok": False, "error": f"Invalid JSON: {exc}"}

        # ── Write to imports/frontend.json (whole-file, own source file) ──
        imports_path = ArchitectureStore().root() / "_pipeline" / "imports" / "frontend.json"
        imports_path.parent.mkdir(parents=True, exist_ok=True)
        imports_path.write_text(json.dumps({"frontend": data}, indent=2) + "\n", encoding="utf-8")

        logger.info(
            "DepCruiserActivity: wrote frontend imports (%d modules) to %s",
            len(data.get("modules", [])) if isinstance(data, dict) else 0,
            imports_path,
        )

        return {"ok": True, "frontend": data}

    except subprocess.TimeoutExpired:
        logger.error("DepCruiserActivity: subprocess timed out after 300s")
        return {"ok": False, "error": "dependency-cruiser timed out after 300s"}
    except FileNotFoundError:
        logger.error("DepCruiserActivity: npx or dependency-cruiser not found")
        return {"ok": False, "error": "npx/dependency-cruiser not found – is Node.js installed?"}
    except Exception:
        logger.exception("DepCruiserActivity: unexpected error")
        return {"ok": False, "error": "Unexpected error during dependency-cruiser analysis"}
