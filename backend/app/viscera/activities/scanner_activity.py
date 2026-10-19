"""Restate-Service-Wrapper für den SQLAlchemy-Tabellen-Scanner (ER-Scan).

Ruft die Scanner-Engine ``app.viscera.infrastructure.scanner_client.run()`` als
Restate-Activity auf und liefert deren Ergebnis als serialisierbares Dict.
Die Scanner-Engine schreibt das kanonische ``tables/app.json`` in
``architecture/_pipeline/``, das der ``DeterministicProcessor`` im selben
Scan-Lauf als ER-Section verarbeitet.

Der Wrapper ist bewusst dünn – die gesamte Scan-Logik liegt in
``scanner.run()`` (Namespace Discipline, ``__init__.py`` bleibt leer).
"""

from __future__ import annotations

from typing import Any

import structlog
from restate import Context, Service

from app.viscera.infrastructure.scanner_client import run as run_scanner

logger = structlog.get_logger(__name__)

sqlalchemy_scanner_service = Service("SqlAlchemyScannerActivity")


@sqlalchemy_scanner_service.handler()
async def run(ctx: Context, arg: dict[str, Any]) -> dict[str, Any]:
    """Führe die Scanner-Engine aus und liefere die Tabellen-Summary.

    Args:
        ctx: Restate-Kontext.
        arg: Optionales Dict (reserviert für zukünftige Optionen).

    Returns:
        Dict mit ``ok`` und ``tables`` (Base-Key → Anzahl Tabellen) bei
        Erfolg, bzw. ``ok: False`` mit ``error`` bei Fehlern.
    """
    logger.info("SqlAlchemyScannerActivity: running scanner")

    try:
        summary = run_scanner()
    except Exception as exc:
        logger.exception("SqlAlchemyScannerActivity: scanner failed")
        return {"ok": False, "error": str(exc)}

    logger.info(
        "SqlAlchemyScannerActivity: scanner done – %d tables",
        sum(summary.get("tables", {}).values()),
    )
    return summary
