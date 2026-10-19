"""Central architecture storage boundary.

Single place for path resolution and collection access. Knows a ``source``
(``code`` today; ``golden`` for the parallel golden sub-world under
``architecture/golden/``) and exposes the architecture root plus the
well-known sub-collections (``nodes``, ``edges``, ``groups``, ``diagrams``).

Namespace-Discipline: this module is intentionally dependency-light and pulled
in via explicit imports at the usage site (``__init__.py`` stays empty). It
performs no I/O in the constructor; path resolution is lazy and pure.
"""

from __future__ import annotations

from pathlib import Path

SOURCE_CODE = "code"
"""Default source: the live, scanned architecture (current behaviour)."""

SOURCE_GOLDEN = "golden"
"""Parallel golden sub-world under ``architecture/golden/``."""

ARCHITECTURE_SOURCES = frozenset({SOURCE_CODE, SOURCE_GOLDEN})
"""Valid architecture ``source`` values."""


def _validate_source(source: str) -> None:
    """Validate that *source* is a known architecture source.

    Args:
        source: Candidate architecture source identifier.

    Raises:
        ValueError: If *source* is not part of :data:`ARCHITECTURE_SOURCES`.
    """
    if source not in ARCHITECTURE_SOURCES:
        raise ValueError(f"Unknown architecture source '{source}'. Valid: {', '.join(sorted(ARCHITECTURE_SOURCES))}")


def _arch_root_dir() -> Path:
    """Resolve the ``architecture/`` root directory.

    Candidates (first existing wins):
    1. ``cwd/architecture`` – host run from the project root.
    2. ``cwd/../architecture`` – container: WORKDIR ``/repo/backend`` resolves
       to ``/repo/architecture`` (the compose override mounts the repo root at
       ``/repo``, so no bind artifact lands under ``backend/``).
    3. ``<repo-root>/architecture`` (file-relative) – host fallback.
    """
    cwd = Path.cwd()
    candidates = [
        cwd / "architecture",
        cwd.parent / "architecture",
        Path(__file__).resolve().parents[5] / "architecture",
    ]
    for candidate in candidates:
        if candidate.is_dir():
            return candidate
    return candidates[0]


def resolve_architecture_dir(source: str = SOURCE_CODE) -> Path:
    """Resolve the architecture root for *source*.

    ``source="code"`` resolves to the live ``architecture/`` root (identical
    behaviour to the historical resolver). ``source="golden"`` resolves to the
    parallel golden sub-world ``<arch-root>/golden``.
    """
    _validate_source(source)
    root = _arch_root_dir()
    if source == SOURCE_GOLDEN:
        return root / "golden"
    return root


class ArchitectureStore:
    """Source-aware access to the architecture storage collections.

    Pure path resolution — instantiating the store performs no I/O; directory
    existence checks happen lazily in :meth:`root` (shared resolver semantics).
    """

    def __init__(self, source: str = SOURCE_CODE) -> None:
        _validate_source(source)
        self._source = source

    def root(self) -> Path:
        """Return the architecture root directory for this store's source.

        Returns:
            The resolved root directory (live ``architecture/`` or its
            ``golden`` sub-world).
        """
        return resolve_architecture_dir(self._source)

    def nodes_dir(self) -> Path:
        """Return the directory holding the node collection.

        Returns:
            ``<root>/nodes``.
        """
        return self.root() / "nodes"

    def edges_dir(self) -> Path:
        """Return the directory holding the edge collection.

        Returns:
            ``<root>/edges``.
        """
        return self.root() / "edges"

    def groups_dir(self) -> Path:
        """Return the directory holding the group collection.

        Returns:
            ``<root>/groups``.
        """
        return self.root() / "groups"

    def diagrams_dir(self) -> Path:
        """Return the directory holding the diagram collection.

        Returns:
            ``<root>/diagrams``.
        """
        return self.root() / "diagrams"

    def workspace_path(self) -> Path:
        """Return the path to the architecture workspace manifest.

        Returns:
            ``<root>/workspace.yml``.
        """
        return self.root() / "workspace.yml"
