"""AIScope-Scraper als einmaliger Fargate-Batch-Job.

Eigenständiger Entrypoint für den isolierten ECS-RunTask-Scraper-Job
(``gjo-se-prod-scraper``): bootstrapet die App (volle Mapper-Registry, wie beim
Server-Start) und ruft dann EINZIG die kanonische Orchestrierung
``unified_scraper_service.run_unified_scraper`` auf – exakt dieselbe Funktion,
die auch die dev-In-Process-Variante im ``aiscope_router`` nutzt (SSOT-Regel,
keine parallele Scraper-Logik). Er beendet sich per Exit-Code:
  * ``0`` bei Erfolg,
  * ``1`` bei Fehler (Fargate-RunTask-Poll wertet den Exit-Code aus).

Steuerung über Umgebungsvariablen:
  * ``SCRAPER_FORCE_FULL``  ("true"/"false", Default false) – Delta-Cutoff ignorieren
  * ``SCRAPER_MAX_RESULTS`` (int, Default leer/unbegrenzt) – Limit pro JobRole
  * ``SCRAPER_SINCE_DAYS``  (int, Default leer) – unterer Zeit-Bound (Tage) für
    einen gebundenen Backfill (z. B. 10 = nur Projekte der letzten 10 Tage)

Der Job läuft NIE im always-on API-Prozess; er schreibt direkt nach RDS
(``project.vector`` nach Inc-10) und nutzt keinen lokalen Vector-Store.
"""

from __future__ import annotations

import asyncio
import importlib
import os
import sys

import structlog

logger = structlog.get_logger(__name__)


def _env_bool(name: str, default: bool = False) -> bool:
    """Parse a boolean environment variable (leniently)."""
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str) -> int | None:
    """Parse an optional positive-int environment variable (None if unset/invalid)."""
    raw = os.environ.get(name)
    if not raw:
        return None
    try:
        return int(raw)
    except ValueError:
        logger.warning("Ignoring non-integer env %s=%s", name, raw)
        return None


async def _main() -> int:
    """Bootstrap the app and run the canonical unified scraper once.

    ``import app.main`` registriert die volle SQLAlchemy-Mapper-Registry BEVOR die
    erste DB-Session öffnet (wie beim Server-Start). Ohne sie schlägt die
    async-Mapper-Init auf Relationship-Auflösung fehl (z. B. TaskModelConfig
    -> LLMModel) beim Core-Credential-Zugriff – identisch zur laufenden App.
    """
    importlib.import_module("app.main")
    from app.fbf.dependencies.fbf_dependencies import (
        get_embedding_service,
        get_freelancermap_mapper_client,
        get_freelancermap_scraping_service,
    )
    from app.fbf.services.unified_scraper_service import (
        run_unified_scraper,
    )

    force_full = _env_bool("SCRAPER_FORCE_FULL")
    max_results = _env_int("SCRAPER_MAX_RESULTS")
    since_days = _env_int("SCRAPER_SINCE_DAYS")

    try:
        result = await run_unified_scraper(
            force_full=force_full,
            max_results=max_results,
            since_days=since_days,
            scraper_factory=get_freelancermap_scraping_service,
            mapper=get_freelancermap_mapper_client(get_embedding_service()),
        )
    except Exception:
        logger.exception("run_scraper_job: unified scraper run failed")
        return 1

    if result.get("status") != "done":
        logger.error("run_scraper_job: run did not complete: %s", result)
        return 1

    logger.info("run_scraper_job: done – saved=%s stats=%s", result.get("saved"), result.get("stats"))
    return 0


def main() -> int:
    """CLI entrypoint – returns the process exit code."""
    try:
        return asyncio.run(_main())
    except Exception:
        logger.exception("run_scraper_job: fatal error")
        return 1


if __name__ == "__main__":
    sys.exit(main())
