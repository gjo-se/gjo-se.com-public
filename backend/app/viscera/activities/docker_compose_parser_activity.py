"""Restate activity for Docker Compose service parsing.

Parses ``docker-compose.yml``, ``docker-compose.override.yml``, and
``docker-compose.langfuse.yml``, extracts all service metadata
(name, source, ports, depends_on, logging, command), and persists
the structured data to ``architecture/_pipeline/imports/docker.json``
(``docker`` section).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import structlog
from restate import Context, Service
from ruamel.yaml import YAML, YAMLError

from app.viscera.repositories.file.architecture_repository import ArchitectureStore

logger = structlog.get_logger(__name__)

docker_compose_parser_service = Service("DockerComposeParserActivity")

yaml_parser = YAML(typ="safe")


def _resolve_project_root() -> Path:
    """Resolve the project root directory containing docker-compose files."""
    cwd = Path.cwd()
    candidates = [
        cwd,
        Path(__file__).resolve().parents[5],
    ]
    for candidate in candidates:
        if (candidate / "docker-compose.yml").exists():
            return candidate
    # Fallback: architecture dir parent (project root when architecture/ is mounted)
    arch_dir = ArchitectureStore().root()
    return arch_dir.parent


def _load_yaml(filepath: Path) -> dict[str, Any]:
    """Load a YAML file safely, returning an empty dict if not found or unreadable."""
    if not filepath.is_file():
        return {}
    try:
        with open(str(filepath), encoding="utf-8") as fh:
            data = yaml_parser.load(fh)
            return data if isinstance(data, dict) else {}
    except (YAMLError, OSError):
        logger.warning("Could not load YAML file: %s", filepath)
        return {}


def _deep_merge(base_svc: dict[str, Any], override_svc: dict[str, Any]) -> None:
    """Deep-merge override keys into base service dict (mutates base_svc).

    Only updates top-level keys from override — child dicts/lists are
    replaced wholesale (docker-compose semantics). This preserves
    base-only keys like ``depends_on``, ``ports``, ``env_file``.
    """
    base_svc.update(override_svc)


def _extract_service(name: str, svc: dict[str, Any]) -> dict[str, Any]:
    """Extract relevant fields from a single docker-compose service definition.

    Args:
        name: Service name.
        svc: Raw service definition from docker-compose YAML.

    Returns:
        Structured dict with ``name``, ``source``, and optional fields.
    """
    entry: dict[str, Any] = {"name": name}

    # Classification: build vs image
    if "build" in svc:
        entry["source"] = "build"
        build_val = svc["build"]
        entry["build"] = build_val if isinstance(build_val, dict) else str(build_val)
    elif "image" in svc:
        entry["source"] = "image"
        entry["image"] = svc["image"]

    if "ports" in svc:
        entry["ports"] = svc["ports"]
    if "depends_on" in svc:
        entry["depends_on"] = svc["depends_on"]
    if "logging" in svc:
        entry["logging"] = svc["logging"]
    if "command" in svc:
        entry["command"] = svc["command"]
    if "labels" in svc:
        entry["labels"] = svc["labels"]

    return entry


@docker_compose_parser_service.handler()
async def run(ctx: Context, arg: dict[str, Any]) -> dict[str, Any]:
    """Parse docker-compose files and persist service metadata.

    Reads ``docker-compose.yml`` (base), merges with
    ``docker-compose.override.yml`` via ``dict.update`` at the service
    level, then reads ``docker-compose.langfuse.yml`` as a separate
    service set. All extracted services are written to
    ``architecture/_pipeline/imports/docker.json`` under the ``"docker"`` key.

    Args:
        ctx: Restate context.
        arg: Optional dict (reserved for future options).

    Returns:
        Dict with ``ok`` and ``services_found`` keys on success,
        or ``ok: False`` with ``error`` on failure.
    """
    project_root = _resolve_project_root()

    logger.info("DockerComposeParserActivity: parsing docker-compose files from %s", project_root)

    try:
        # ── Load base docker-compose.yml ─────────────────────────────────
        base_path = project_root / "docker-compose.yml"
        if not base_path.is_file():
            logger.error("DockerComposeParserActivity: docker-compose.yml not found at %s", base_path)
            return {"ok": False, "error": f"docker-compose.yml not found at {base_path}"}

        base = _load_yaml(base_path)

        # ── Merge override (deep, per-service) ───────────────────────────
        override_path = project_root / "docker-compose.override.yml"
        if override_path.is_file():
            override = _load_yaml(override_path)
            base_services = base.get("services", {})
            override_services = override.get("services", {})
            for svc_name, override_svc in override_services.items():
                if svc_name in base_services:
                    _deep_merge(base_services[svc_name], override_svc)
                else:
                    base_services[svc_name] = override_svc
            base["services"] = base_services
            logger.info(
                "DockerComposeParserActivity: merged override (%d overridden services)",
                len(override_services),
            )

        # ── Load langfuse (separate stack) ───────────────────────────────
        langfuse_path = project_root / "docker-compose.langfuse.yml"
        langfuse_services: dict[str, Any] = {}
        if langfuse_path.is_file():
            langfuse = _load_yaml(langfuse_path)
            langfuse_services = langfuse.get("services", {})

        # ── Extract services ─────────────────────────────────────────────
        all_services: list[dict[str, Any]] = []
        for svc_name, svc_def in base.get("services", {}).items():
            all_services.append(_extract_service(svc_name, svc_def))
        for svc_name, svc_def in langfuse_services.items():
            all_services.append(_extract_service(svc_name, svc_def))

        # ── Write to imports/docker.json (whole-file, own source file) ──
        imports_path = ArchitectureStore().root() / "_pipeline" / "imports" / "docker.json"
        imports_path.parent.mkdir(parents=True, exist_ok=True)
        imports_path.write_text(json.dumps({"docker": all_services}, indent=2) + "\n", encoding="utf-8")

        services_found = len(all_services)
        logger.info(
            "DockerComposeParserActivity: wrote %d docker services to %s",
            services_found,
            imports_path,
        )

        return {"ok": True, "services_found": services_found}

    except Exception:
        logger.exception("DockerComposeParserActivity: unexpected error")
        return {"ok": False, "error": "Unexpected error during Docker Compose parsing"}
