"""Scanner-Eintrittspunkt: SQLAlchemy-Introspection → ``tables[]``.

Discovert alle ``models/*.py``-Module unter ``app``, importiert sie (Soft-Skip
je Modul bei Import-Fehlern), introspiziert die **eine** SQLAlchemy-``Base.metadata``
und persistiert das kanonische ``tables[]``-Artefakt nach
``architecture/_pipeline/tables/``.

Seit der DB-Konsolidierung gibt es genau **eine** Declarative Base (eine
Metadaten) – daher genau **einen** Scan über das flache ``app``-Package
(früher zwei Scans über ``app.core`` / ``app.gjo_se_com``).

Standalone-Verifikation: ``python -m app.viscera.infrastructure.scanner_client``.
"""

from __future__ import annotations

import importlib
import sys
from pathlib import Path
from typing import Any

import structlog
from sqlalchemy import MetaData, Table

from app.shared.db_access.base import Base
from app.viscera.domain.tables_rules import derive_domain, map_metadata
from app.viscera.repositories.file.architecture_repository import resolve_architecture_dir
from app.viscera.repositories.file.tables_repository import write_tables

logger = structlog.get_logger(__name__)

# ``backend/app`` – Host-Wurzel des App-Packages (relative Basis der Discovery).
_BACKEND_ROOT = Path(__file__).resolve().parents[2]

# Die eine kanonische Base (eine Metadaten) und ihr flacher Wurzelpfad.
_BASE_KEY = "app"
_BASE_PACKAGE = "app"
_BASE_ROOT = _BACKEND_ROOT / "app"


def discover_models(root: Path, base_package: str) -> list[str]:
    """Discover alle ``models/*.py``-Module unter *root* als dotted Importpfade.

    Walkt echte ``models/``-Verzeichnisse unter dem übergebenen Wurzelpfad und
    übersetzt die relativen Dateipfade in dotted Modulpfade (z. B.
    ``app.fbf.models.project``). ``__init__.py`` wird
    ausgeschlossen. Die Ausgabe ist sortiert und dedupliziert.

    Args:
        root: Wurzel des zu scannenden App-Packages (z. B. ``backend/app``).
        base_package: Dotted Root (z. B. ``app``).

    Returns:
        Sortierte, deduplizierte Liste dotted Modul-Importpfade.
    """
    paths: list[str] = []
    for models_dir in sorted(root.rglob("models")):
        if not models_dir.is_dir():
            continue
        for py_file in sorted(models_dir.glob("*.py")):
            if py_file.name == "__init__.py":
                continue
            parts = list(py_file.relative_to(root).parts)
            parts[-1] = parts[-1][:-3]  # ``.py``-Suffix entfernen
            paths.append(".".join([base_package, *parts]))
    return sorted(set(paths))


def _import_all(paths: list[str]) -> None:
    """Importiere alle Modulpfade; Soft-Skip je Modul bei Import-Fehlern.

    Ein fehlgeschlagenes Modul wird geloggt (``exc_info=True``) und übersprungen –
    die Modelle dieses Moduls fehlen dann in der Introspection, der Gesamtlauf
    bricht aber nicht ab.
    """
    for path in paths:
        try:
            importlib.import_module(path)
        except Exception:
            logger.exception("Scanner: import failed for %s", path)


def _build_domain_by_table(
    paths: list[str],
    base_package: str,
    domain_by_table: dict[str, str],
) -> None:
    """Ordne je importiertem Modul dessen Tabellen dem Feature-`domain` zu.

    Für jedes bereits importierte Modul (via ``sys.modules``) werden die im
    Modul-Namespace definierten SQLAlchemy-Tabellen bzw. mapped Klassen
    (``__tablename__``) ermittelt und mit dem per ``derive_domain`` abgeleiteten
    Feature-Segment verknüpft.
    """
    for path in paths:
        module = sys.modules.get(path)
        if module is None:
            continue
        domain = derive_domain(path, base_package)
        for value in vars(module).values():
            if isinstance(value, Table):
                # Explizite Table-Objekte haben keinen ``__module__``-Verweis –
                # nur setzen, wenn noch kein Domain zugeordnet ist (first-wins).
                if value.name not in domain_by_table:
                    domain_by_table[value.name] = domain
            elif isinstance(value, type):
                tablename = getattr(value, "__tablename__", None)
                if tablename and getattr(value, "__module__", None) == module.__name__:
                    # Nur das Definitions-Modul attribuiert – re-exportierte
                    # Klassen würden sonst den Domain überschreiben.
                    domain_by_table[tablename] = domain


def _scan_base(base_key: str, metadata: MetaData, base_package: str, root: Path) -> list[dict[str, Any]]:
    """Scan eine Base: Discovery → Import → Mapping → kanonische ``tables[]``."""
    paths = discover_models(root, base_package)
    _import_all(paths)

    domain_by_table: dict[str, str] = {}
    _build_domain_by_table(paths, base_package, domain_by_table)

    return map_metadata(metadata, base_key, domain_by_table)


def run(base: str | None = None) -> dict[str, Any]:
    """Orchestriere den Scanner über die eine kanonische Base (``app``).

    Args:
        base: Optional nur eine Base scannen. Es existiert genau eine
            (``app``); jeder andere Wert ist ein Fehler.

    Returns:
        Summary mit ``ok`` und ``tables`` (Base-Key → Anzahl Tabellen).
    """
    if base is not None and base != _BASE_KEY:
        raise ValueError(f"Unbekannter Base-Key {base!r} – erwartet {_BASE_KEY!r}")

    arch_root = resolve_architecture_dir()
    tables = _scan_base(_BASE_KEY, Base.metadata, _BASE_PACKAGE, _BASE_ROOT)
    logger.info("Scanner: scanned %d tables for base=%s", len(tables), _BASE_KEY)
    write_tables(arch_root, _BASE_KEY, tables)

    return {"ok": True, "tables": {_BASE_KEY: len(tables)}}


if __name__ == "__main__":
    summary = run()
    logger.info("Scanner: finished %s", summary)
