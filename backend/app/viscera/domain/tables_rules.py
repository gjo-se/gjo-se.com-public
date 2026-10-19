"""Mapper layer: ``Base.metadata`` → kanonisches ``tables[]``.

Pure Funktionen ohne I/O. Die Introspection der SQLAlchemy-``MetaData`` wird an
der Engine-Grenze in das kanonische Tabellen-Schema normalisiert, sodass die
Scanner-Engine austauschbar bleibt. Das kanonische Element je Tabelle ist
``{name, base, domain, columns[], fks[]}``.

Determinismus: Tabellen sind nach ``name`` sortiert, Spalten bleiben in der
Metadata-Reihenfolge, Indexnamen sind sortiert, Fremdschlüssel nach Spaltenname
sortiert. Zwei Läufe erzeugen damit byte-identische Dateien.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import MetaData, Table


def derive_domain(module_dotted: str, base_root: str) -> str:
    """Leite den ``domain``-Key aus einem dotted Modulpfad ab.

    ``domain`` ist das erste Segment nach dem Base-Root. Für
    ``app.portfolio.models.project`` mit base_root ``app``
    ergibt sich ``"portfolio"``; für ``app.shared.tagging.models.tag`` mit
    base_root ``app`` ergibt sich ``"shared"``.

    Args:
        module_dotted: Voller dotted Modulpfad (z. B. ``app.portfolio.models.project``).
        base_root: Dotted Root des Base-Packages (``app``).

    Returns:
        Feature-Ordner-Segment (z. B. ``tasks``, ``portfolio``).
    """
    prefix = f"{base_root}."
    rest = module_dotted[len(prefix) :] if module_dotted.startswith(prefix) else module_dotted
    return rest.split(".")[0]


def _default_str(arg: Any) -> str:
    """Deterministische String-Repräsentation eines Column-Defaults.

    Callable-Defaults (Lambdas, Funktionen) würden via ``repr`` ihre
    Speicheradresse enthalten und damit die byte-identische Ausgabe über zwei
    Läufe brechen. Für Callables wird stattdessen der (stabile) Funktionsname
    bzw. der Typname verwendet; Skalare bleiben ``str(arg)``.
    """
    if callable(arg):
        name = getattr(arg, "__name__", None)
        return name if name else type(arg).__name__
    return str(arg)


def _indexes_by_column(table: Table) -> dict[str, list[str]]:
    """Ordne je Spalte die Namen der zugehörigen Indizes zu.

    SQLAlchemy-``Column``-Objekte tragen keinen ``indexes``-Verweis mehr –
    die Indexnamen werden über ``table.indexes`` (set von ``Index``) ermittelt
    und je Spaltenname als sortierte Liste abgelegt.
    """
    by_col: dict[str, list[str]] = {}
    for index in table.indexes:
        name = index.name
        if not name:
            continue
        for col in index.columns:
            by_col.setdefault(col.name, []).append(name)
    return {col: sorted(names) for col, names in by_col.items()}


def _map_columns(table: Table) -> list[dict[str, Any]]:
    """Extrahiere die kanonische ``columns[]``-Liste einer Tabelle.

    Spalten bleiben in der Metadata-Reihenfolge (``table.columns``). Der Typ
    wird inkl. Länge über ``str(col.type).lower()`` normalisiert
    (z. B. ``"varchar(255)"``, ``"numeric(10, 2)"``).
    """
    indexes_by_col = _indexes_by_column(table)
    columns: list[dict[str, Any]] = []
    for col in table.columns:
        col_entry: dict[str, Any] = {
            "name": col.name,
            "type": str(col.type).lower(),
            "nullable": bool(col.nullable),
            "pk": bool(col.primary_key),
            "unique": bool(col.unique),
            "indexes": indexes_by_col.get(col.name, []),
        }
        default_arg = getattr(col.default, "arg", None)
        if col.default is not None and default_arg is not None:
            col_entry["default"] = _default_str(default_arg)
        if col.comment is not None:
            col_entry["comment"] = col.comment
        columns.append(col_entry)
    return columns


def _map_fks(table: Table) -> list[dict[str, Any]]:
    """Extrahiere die kanonische ``fks[]``-Liste einer Tabelle.

    Je ``ForeignKey`` einer Spalte wird ein Eintrag
    ``{"column", "ref_table", "ref_column"}`` erzeugt. Fremdschlüssel sind nach
    Spaltenname sortiert, um Determinismus zu garantieren.
    """
    fks: list[dict[str, Any]] = [
        {
            "column": col.name,
            "ref_table": fk.column.table.name,
            "ref_column": fk.column.name,
        }
        for col in sorted(table.columns, key=lambda c: c.name)
        for fk in col.foreign_keys
    ]
    return fks


def map_metadata(
    metadata: MetaData,
    base: str,
    domain_by_table: dict[str, str],
) -> list[dict[str, Any]]:
    """Map eine SQLAlchemy-``MetaData`` auf das kanonische ``tables[]``.

    Args:
        metadata: Zu introspizierende ``MetaData`` der Declarative-Base.
        base: Base-Key (``app``).
        domain_by_table: Mapping Tabellenname → ``domain``-Segment (Feature-Ordner).

    Returns:
        Sortierte Liste kanonischer Tabellen-Elemente mit den Keys ``name``,
        ``base``, ``domain``, ``columns[]``, ``fks[]``.
    """
    tables: list[dict[str, Any]] = []
    for table_name in sorted(metadata.tables.keys()):
        table = metadata.tables[table_name]
        tables.append(
            {
                "name": table.name,
                "base": base,
                "domain": domain_by_table.get(table.name, ""),
                "columns": _map_columns(table),
                "fks": _map_fks(table),
            }
        )
    return tables


__all__ = ["derive_domain", "map_metadata"]
