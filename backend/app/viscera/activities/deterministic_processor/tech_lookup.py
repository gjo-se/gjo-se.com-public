"""Technology candidate lookup for Docker services.

Two-stage catalog lookup for image services (exact/contains DB → vector Cosine)
and build-context dependency parsing (``pyproject.toml``/``package.json``)
matched against the technology catalog. Candidates are suggestions only — the
scanner never assigns technologies directly.
"""

from __future__ import annotations

import json
import tomllib
from pathlib import Path
from typing import Any

import structlog

from app.shared.embedding.domain.similarity_rules import cosine_similarity

logger = structlog.get_logger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────

COSINE_THRESHOLD: float = 0.7

MAX_TECHNOLOGY_CANDIDATES: int = 5


def _parse_image_slug(image: str) -> str:
    """Extract the slug from a Docker image reference.

    ``grafana/loki:3.0.0`` → ``"loki"``
    ``postgres:16`` → ``"postgres"``
    """
    name = image.split(":", maxsplit=1)[0]
    return name.split("/")[-1]


async def _stage1_db_lookup(
    slug: str,
    db: Any,
    *,
    source_exact: str = "db-exact",
    source_contains: str = "db-contains",
) -> list[dict[str, str]]:
    """Collect DB technology candidates for a slug from ``core_technology_catalog``.

    Exact ``slug`` matches come first (``source_exact``), followed by all
    ILIKE contains matches (``source_contains``). Candidates are
    slug-deduplicated, DB hits take precedence over vector hits, and the
    list is capped at ``MAX_TECHNOLOGY_CANDIDATES``. Returns an empty list
    if nothing matches.

    Args:
        slug: Extracted slug (e.g. ``"loki"`` or a normalized dependency name).
        db: Async database session (gjo_se_com).
        source_exact: Source tag for exact matches (default ``"db-exact"``).
        source_contains: Source tag for ILIKE matches (default ``"db-contains"``).

    Returns:
        List of candidates with ``slug``, ``name`` and ``source``.
    """
    from sqlalchemy import select

    from app.shared.technology_catalog.models.technology import Technology

    candidates: list[dict[str, str]] = []
    seen_slugs: set[str] = set()

    # Exact slug match
    stmt = select(Technology).where(Technology.slug == slug)
    result = await db.execute(stmt)
    tech = result.scalar_one_or_none()
    if tech is not None:
        candidates.append({"slug": tech.slug, "name": tech.name, "source": source_exact})
        seen_slugs.add(tech.slug)

    # ILIKE contains fallback — all relevant hits as candidates
    stmt = select(Technology).where(Technology.slug.ilike(f"%{slug}%"))
    result = await db.execute(stmt)
    for tech in result.scalars():
        if tech.slug in seen_slugs:
            continue
        seen_slugs.add(tech.slug)
        candidates.append({"slug": tech.slug, "name": tech.name, "source": source_contains})
        if len(candidates) >= MAX_TECHNOLOGY_CANDIDATES:
            break

    return candidates


async def _stage2_vector_search(
    query: str,
    db: Any,
    core_db: Any,
    top_k: int = 5,
) -> list[dict[str, str]]:
    """Vector similarity candidates via Postgres ``core_technology_catalog.vector``.

    Embeds the query text via ``EmbeddingService``, computes cosine
    similarity against every catalog Technology vector, and returns the
    closest results above ``COSINE_THRESHOLD`` as candidates
    (``source="vector"``). Candidates are non-critical suggestions, so the
    threshold is deliberately not raised and no whitelist is applied.
    Returns an empty list if nothing matches.

    Args:
        query: Image slug as search query.
        db: Async gjo_se_com session for the ``Technology`` query.
        core_db: Async core session used for embedding credential lookup.
        top_k: Maximum results to return.

    Returns:
        List of candidates with ``slug``, ``name`` and ``source``.
    """
    from sqlalchemy import select

    from app.shared.embedding.dependencies.embedding_dependencies import get_embedding_client
    from app.shared.technology_catalog.models.technology import Technology

    try:
        embedding_service = get_embedding_client()
        vector = await embedding_service.embed_text(query, core_db)
    except Exception:
        logger.exception("Embedding generation failed for query=%s", query)
        return []

    try:
        result = await db.execute(select(Technology).where(Technology.vector.isnot(None)))
        technologies = list(result.scalars().all())
    except Exception:
        logger.exception("Technology vector load failed for query=%s", query)
        return []

    ranked: list[tuple[Technology, float]] = []
    for tech in technologies:
        if tech.vector is None:
            continue
        similarity = cosine_similarity(vector, tech.vector)
        ranked.append((tech, similarity))
    ranked.sort(key=lambda item: item[1], reverse=True)

    candidates: list[dict[str, str]] = []
    for tech, cosine_score in ranked:
        if cosine_score <= COSINE_THRESHOLD:
            continue
        candidates.append(
            {
                "slug": tech.slug,
                "name": tech.name,
                "source": "vector",
            }
        )
        if len(candidates) >= top_k:
            break

    return candidates


def _build_context_path(build: Any) -> Path | None:
    """Resolve the build context path from a Compose ``build`` value.

    Handles both ``build: "./backend"`` (string) and
    ``build: {"context": "./frontend"}`` (dict) forms. Returns ``None``
    when no usable context can be extracted.
    """
    if isinstance(build, dict):
        context = build.get("context")
        return Path(str(context)) if context else None
    if isinstance(build, str) and build:
        return Path(build)
    return None


def _resolve_build_dir(project_root: Path, context: Path) -> Path | None:
    """Resolve a build context to an existing directory.

    The plain ``project_root / context`` path is tried first. When the
    context is not mounted as a subdirectory (docker-compose.override.yml
    mounts ``./backend:/app``, making the backend context the project root
    itself), the project root is used as fallback. Returns ``None`` when
    neither path exists.
    """
    candidates = [project_root / context]
    if not candidates[0].is_dir():
        candidates.append(project_root)
    for candidate in candidates:
        if candidate.is_dir():
            return candidate
    return None


def _dependency_slug(name: str) -> str:
    """Normalize a dependency declaration to a catalog-searchable slug.

    Strips Python extras (``fastapi[standard]``) and version constraints
    (``fastapi>=0.135``), and reduces npm scoped names to the bare package
    name (``@tanstack/react-query`` → ``react-query``).
    """
    dep = name.split("[", maxsplit=1)[0]
    for sep in (">=", "<=", "==", "!=", "~=", ">", "<", "~", "^", "="):
        dep = dep.split(sep, maxsplit=1)[0]
    dep = dep.strip().lstrip("@")
    if "/" in dep:
        dep = dep.split("/", maxsplit=1)[-1]
    return dep.lower()


def _extract_pyproject_dependencies(content: str) -> list[str]:
    """Extract dependency declarations from ``pyproject.toml``.

    Reads only ``project.dependencies`` (the mandatory group per ticket;
    optional groups are intentionally not parsed). Returns an empty list
    on TOML parse errors or when the table/list is missing.
    """
    try:
        data = tomllib.loads(content)
    except tomllib.TOMLDecodeError:
        return []
    project = data.get("project")
    if not isinstance(project, dict):
        return []
    dependencies = project.get("dependencies")
    if not isinstance(dependencies, list):
        return []
    return [dep for dep in dependencies if isinstance(dep, str)]


def _extract_package_json_dependencies(data: dict[str, Any]) -> list[str]:
    """Extract dependency names from a parsed ``package.json``.

    Reads both ``dependencies`` and ``devDependencies`` maps; non-string
    entries are ignored.
    """
    names: list[str] = []
    for section in ("dependencies", "devDependencies"):
        deps = data.get(section)
        if isinstance(deps, dict):
            names.extend(str(name) for name in deps)
    return names


async def _append_dependency_candidates(
    dep_name: str,
    source: str,
    db: Any,
    candidates: list[dict[str, str]],
    seen_slugs: set[str],
) -> None:
    """Match a dependency name against the catalog and append DB candidates."""
    slug = _dependency_slug(dep_name)
    if not slug:
        return
    for candidate in await _stage1_db_lookup(
        slug,
        db,
        source_exact=source,
        source_contains=source,
    ):
        if candidate["slug"] in seen_slugs:
            continue
        seen_slugs.add(candidate["slug"])
        candidates.append(candidate)


async def _lookup_build_candidates(
    build: Any,
    project_root: Path,
    gjo_se_db: Any,
    service_name: str,
) -> list[dict[str, str]]:
    """Collect technology candidates from build-context dependency files.

    Resolves the build context (dict ``context`` / string path), reads
    ``pyproject.toml`` (``project.dependencies``) and ``package.json``
    (``dependencies`` + ``devDependencies``), and matches each dependency
    name against the technology catalog (Stage 1 DB only — exact slug +
    ILIKE contains). Candidates are tagged with ``source`` ``pyproject`` /
    ``package-json`` and slug-deduplicated. Missing files or parse errors
    log a warning and contribute no candidates.

    The Stage 2 vector fallback is intentionally omitted: embedding dozens
    of dependencies per service is prohibitively expensive, and the target
    build services match the DB catalog directly.
    """
    context = _build_context_path(build)
    if context is None:
        logger.warning(
            "DeterministicProcessor: no build context for service=%s",
            service_name,
        )
        return []

    build_dir = _resolve_build_dir(project_root, context)
    if build_dir is None:
        logger.warning(
            "DeterministicProcessor: build context not found for service=%s context=%s",
            service_name,
            context,
        )
        return []

    candidates: list[dict[str, str]] = []
    seen_slugs: set[str] = set()

    pyproject_path = build_dir / "pyproject.toml"
    if pyproject_path.is_file():
        try:
            deps = _extract_pyproject_dependencies(
                pyproject_path.read_text(encoding="utf-8"),
            )
        except Exception:
            logger.exception(
                "DeterministicProcessor: failed to parse pyproject.toml service=%s",
                service_name,
            )
            deps = []
        for dep_name in deps:
            await _append_dependency_candidates(
                dep_name,
                "pyproject",
                gjo_se_db,
                candidates,
                seen_slugs,
            )
    else:
        logger.warning(
            "DeterministicProcessor: pyproject.toml not found for build service=%s",
            service_name,
        )

    package_json_path = build_dir / "package.json"
    if package_json_path.is_file():
        try:
            package_data = json.loads(package_json_path.read_text(encoding="utf-8"))
        except Exception:
            logger.exception(
                "DeterministicProcessor: failed to parse package.json service=%s",
                service_name,
            )
            package_data = {}
        for dep_name in _extract_package_json_dependencies(package_data):
            await _append_dependency_candidates(
                dep_name,
                "package-json",
                gjo_se_db,
                candidates,
                seen_slugs,
            )
    else:
        logger.warning(
            "DeterministicProcessor: package.json not found for build service=%s",
            service_name,
        )

    return candidates


async def _lookup_technology_candidates(
    image: str | None,
    gjo_se_db: Any,
    core_db: Any,
    *,
    build: Any = None,
    project_root: Path | None = None,
    service_name: str = "",
) -> list[dict[str, str]]:
    """Collect technology candidates for a Docker service from the catalog.

    Two lookup paths feed one slug-deduplicated list capped at
    ``MAX_TECHNOLOGY_CANDIDATES``:

    * Image services (``source="image"``): two-stage lookup — Stage 1 DB
      (exact slug + ILIKE contains, ``db-exact`` / ``db-contains``), Stage 2
      vector fallback (``vector``).
    * Build services (``source="build"``): build-context dependency files
      (``pyproject.toml`` / ``package.json``) matched against the catalog
      (``pyproject`` / ``package-json``).

    Candidates are suggestions only — the scanner never assigns
    technologies directly; assignment happens manually in the FE. DB hits
    come first, the combined list is slug-deduplicated and capped at
    ``MAX_TECHNOLOGY_CANDIDATES``. Returns an empty list when nothing
    matches.

    Args:
        image: Docker image reference or ``None`` for ``build:`` services.
        gjo_se_db: Async database session (gjo_se_com).
        core_db: Core DB session (for vector embedding).
        build: Compose ``build`` value for ``build:`` services.
        project_root: Resolved project root for build-context resolution.
        service_name: Service name (used in warnings).

    Returns:
        List of candidates with ``slug``, ``name`` and ``source``.
    """
    candidates: list[dict[str, str]] = []
    seen_slugs: set[str] = set()

    if image:
        slug = _parse_image_slug(image)

        # Stage 1: DB candidates
        candidates = await _stage1_db_lookup(slug, gjo_se_db)
        seen_slugs = {c["slug"] for c in candidates}

        # Stage 2: vector candidates (deduplicated against DB hits)
        for vector_candidate in await _stage2_vector_search(slug, gjo_se_db, core_db):
            if vector_candidate["slug"] in seen_slugs:
                continue
            seen_slugs.add(vector_candidate["slug"])
            candidates.append(vector_candidate)

    if build is not None and project_root is not None:
        for candidate in await _lookup_build_candidates(
            build,
            project_root,
            gjo_se_db,
            service_name,
        ):
            if candidate["slug"] in seen_slugs:
                continue
            seen_slugs.add(candidate["slug"])
            candidates.append(candidate)

    return candidates[:MAX_TECHNOLOGY_CANDIDATES]


async def _collect_service_candidates(
    svc: dict[str, Any],
    project_root: Path,
    gjo_se_db: Any,
    core_db: Any,
) -> list[dict[str, str]]:
    """Collect technology candidates for a single service (image + build).

    Wraps ``_lookup_technology_candidates`` with per-service error
    tolerance: a failing lookup logs a warning and yields an empty
    candidate list, never aborting the scan.
    """
    service_name = str(svc["name"])
    build = svc.get("build") if svc.get("source") == "build" else None
    try:
        return await _lookup_technology_candidates(
            svc.get("image"),
            gjo_se_db,
            core_db,
            build=build,
            project_root=project_root,
            service_name=service_name,
        )
    except Exception:
        logger.exception(
            "DeterministicProcessor: candidate lookup failed for service=%s",
            service_name,
        )
        return []
