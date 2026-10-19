"""Persistenz der kanonischen ``tables[]``-Artefakte.

Whole-file, self-cleaning: Jeder Lauf ersetzt die Datei vollständig – es können
keine ``scan_missing``-Leichen entstehen. Deterministische Serialisierung via
``json.dumps(..., indent=2, sort_keys=True)`` für byte-identische Dateien über
zwei Läufe.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def write_tables(
    arch_root: Path,
    base_key: str,
    tables: list[dict[str, Any]],
    filename_key: str | None = None,
) -> Path:
    """Schreibe das ``tables[]``-Artefakt der Base als ``{filename}.json``.

    Args:
        arch_root: Wurzel des ``architecture/``-Verzeichnisses.
        base_key: Kanonischer Base-Key, der ins Artefakt geschrieben wird
            (``app``).
        tables: Kanonische Tabellen-Liste der Base.
        filename_key: Dateinamen-Key (ohne ``.json``). Falls nicht gesetzt,
            wird ``base_key`` verwendet.

    Returns:
        Pfad der geschriebenen Datei.
    """
    file_key = filename_key or base_key
    target_dir = arch_root / "_pipeline" / "tables"
    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / f"{file_key}.json"

    data = {"base": base_key, "tables": tables}
    target_path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return target_path


__all__ = ["write_tables"]
