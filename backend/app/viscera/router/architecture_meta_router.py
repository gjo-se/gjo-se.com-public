"""Architecture meta/inspection API endpoints.

Read-only endpoints that inspect architecture storage metadata rather than
mutating objects: file modification times (freshness) and the L4 module-import
list served from the ``_pipeline`` scan output. Split out of
``architecture_router`` into one focused endpoint module per resource
(``check-file-length``); the parent router only composes.
"""

from __future__ import annotations

import asyncio
import json
import os
from datetime import UTC, datetime
from pathlib import Path

import structlog
from fastapi import APIRouter, HTTPException, Query

from app.shared.security.dependencies.auth_dependencies import AdminUser
from app.viscera.repositories.file.architecture_repository import ArchitectureStore
from app.viscera.schemas.architecture_schemas import ImportModuleOut, ImportModulesResponse

logger = structlog.get_logger(__name__)

router = APIRouter()


def _collect_mtimes(arch_root: Path) -> dict[str, float]:
    """Collect ``{relative_filename: mtime}`` for ``.yml``/``.svg`` under ``arch_root``.

    Synchronous filesystem walk, offloaded from the async endpoint via
    ``asyncio.to_thread`` so no blocking path call runs on the event loop.

    Args:
        arch_root: Root directory to walk.

    Returns:
        Mapping of filename relative to ``arch_root`` to its modification time.
    """
    result: dict[str, float] = {}
    for dirpath, _dirnames, filenames in os.walk(arch_root):
        for filename in filenames:
            if not filename.endswith((".yml", ".svg")):
                continue
            full_path = os.path.join(dirpath, filename)
            try:
                rel = os.path.relpath(full_path, arch_root)
                result[rel] = os.stat(full_path).st_mtime
            except OSError:
                logger.warning("Cannot stat file: %s", full_path)
                continue
    return result


@router.get("/mtimes")
async def get_mtimes(_admin: AdminUser) -> dict[str, float]:
    """Return ``{filename: mtime}`` for all ``.yml`` and ``.svg`` files under ``architecture/``.

    Filenames are relative to the ``architecture/`` root.
    Each request reads fresh from disk (no caching).
    """
    arch_root = ArchitectureStore().root()

    if not arch_root.is_dir():
        logger.warning("architecture directory not found: %s", arch_root)
        return {}

    return await asyncio.to_thread(_collect_mtimes, arch_root)


@router.get("/imports", response_model=ImportModulesResponse)
async def get_imports(
    _admin: AdminUser,
    system: str = Query("backend", description="System-Key der Section (aktuell 'backend')"),
    top_level: str | None = Query(None, description="Optionaler Komponenten-Key-Filter auf modules[].top_level"),
) -> ImportModulesResponse:
    """Serve the canonical ``modules[]`` for a system from ``imports/backend.json``.

    Reads ``architecture/_pipeline/imports/backend.json`` (written by the
    pydeps scan workflow) and returns the ``modules[]`` list for the requested
    ``system`` key. The optional ``top_level`` query parameter filters the
    response list only — the file is never modified (read-only endpoint).
    ``generated_at`` is derived from the file modification time (mtime) in
    ISO-8601 UTC, since ``imports/backend.json`` stores no timestamp field.
    """
    imports_path = ArchitectureStore().root() / "_pipeline" / "imports" / "backend.json"

    if not imports_path.is_file():
        logger.warning("imports/backend.json not found: %s", imports_path)
        raise HTTPException(
            status_code=404,
            detail=f"imports/backend.json enthält keine Section für system='{system}'",
        )

    try:
        data = json.loads(imports_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        logger.error("imports/backend.json lesen fehlgeschlagen: %s", exc)
        raise HTTPException(status_code=500, detail=f"imports/backend.json konnte nicht gelesen werden: {exc}") from exc

    modules = data.get(system)
    if not isinstance(modules, dict) or "modules" not in modules:
        raise HTTPException(
            status_code=404,
            detail=f"imports/backend.json enthält keine Section für system='{system}'",
        )

    result_modules = modules["modules"]
    if top_level is not None:
        result_modules = [m for m in result_modules if m.get("top_level") == top_level]

    generated_at = datetime.fromtimestamp(
        imports_path.stat().st_mtime,
        tz=UTC,
    ).isoformat()

    return ImportModulesResponse(
        system=system,
        generated_at=generated_at,
        modules=[ImportModuleOut(**m) for m in result_modules],
    )
