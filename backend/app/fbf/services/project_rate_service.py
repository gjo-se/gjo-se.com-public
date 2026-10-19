"""Deterministic two-layer hourly-rate estimate for a project.

Mirrors the ``project-hourly-rate`` canon (Basisrate × Projekt-/Länderfaktoren)
as a *deterministic* rule engine – deliberately WITHOUT any LLM call:

* **Schicht 1** (Basisrate) kommt aus ``application_profile.hourly_rate``.
* **Schicht 2** (Deckel) wendet nur Faktoren an, deren Beleg am Projekt
  gespeichert ist (``country``, ``endcustomer``, ``duration``, Sofort-Start).
  Semantische Faktoren (Scarce-Kern, Regulierte Domäne) brauchen Beurteilung
  und bleiben daher bei Faktor 1,00 – als Unsicherheit ausgewiesen
  („kein Faktor ohne Beleg").

Persistiert wird **ausschließlich** ``project.hourly_rate`` (= Deckel);
``my_hourly_rate`` bleibt unangetastet.
"""

from __future__ import annotations

import re

import structlog
from fastapi import HTTPException
from fastapi import status as http_status

from app.fbf.repositories import project_repository, project_write_repository
from app.fbf.schemas.project_schemas import (
    ProjectRateEstimateOut,
    RateFactorOut,
)
from app.shared.db_access.session_types import AsyncSession
from app.shared.ports.application import ApplicationBridgePort

logger = structlog.get_logger(__name__)

#: Länderfaktor (Marktpreisniveau) – Schicht 1 nutzt ausschließlich DE-Daten.
_COUNTRY_FACTORS: dict[str, float] = {
    "deutschland": 1.00,
    "germany": 1.00,
    "de": 1.00,
    "österreich": 0.95,
    "oesterreich": 0.95,
    "austria": 0.95,
    "at": 0.95,
    "schweiz": 1.25,
    "switzerland": 1.25,
    "ch": 1.25,
}

#: Endkunde direkt statt Vermittler (wegfallende Vermittler-Marge).
_ENDCUSTOMER_FACTOR = 1.30

#: Explizite Sofort-Start-Marker (deterministisch, ohne Datumsarithmetik).
_IMMEDIATE_START_MARKERS: tuple[str, ...] = (
    "asap",
    "sofort",
    "kurzfristig",
    "nächstmöglich",
    "naechstmoeglich",
    "schnellstmöglich",
    "schnellstmoeglich",
)

_MONTHS_PATTERN = re.compile(r"(\d+)\s*monat")

#: Laufzeit-Schwellen (Monate) für den Diskontinuitäts-/Auslastungsfaktor.
_LONG_PROJECT_MONTHS = 6
_SHORT_PROJECT_MONTHS = 3


def _parse_month_count(duration: str) -> int | None:
    """Return the largest month count mentioned in a free-text duration.

    Handles single values ("6 Monate"), ranges ("6-12 Monate" → 12) and a bare
    numeric month count ("3" → 3). Returns ``None`` when no month count is
    recognisable.
    """
    text = duration.strip().lower()
    matches = _MONTHS_PATTERN.findall(text)
    if matches:
        return max(int(value) for value in matches)
    if text.isdigit():
        return int(text)
    return None


def estimate_rate(
    *,
    base_rate: int,
    country: str | None,
    endcustomer: bool | None,
    duration: str | None,
    start_date: str | None,
    my_start_date: str | None,
) -> ProjectRateEstimateOut:
    """Compute the two-layer estimate from stored project evidence.

    Pure function – no DB access, no side effects. Only factors with a stored
    evidence value are applied; everything else defaults to 1,00 and is listed
    under ``uncertainties``.
    """
    factors: list[RateFactorOut] = []
    uncertainties: list[str] = []

    # ── Länderfaktor ─────────────────────────────────────────────────────
    country_key = (country or "").strip().lower()
    if country_key in _COUNTRY_FACTORS:
        factors.append(
            RateFactorOut(
                label="Länderfaktor",
                factor=_COUNTRY_FACTORS[country_key],
                evidence=country,
            )
        )
    elif country_key:
        uncertainties.append(f"Land '{country}' unbekannt – Länderfaktor 1,00 (Unsicherheit).")
    else:
        uncertainties.append("Land leer – Länderfaktor 1,00 (Unsicherheit).")

    # ── Bezug (Endkunde vs. Vermittler) ──────────────────────────────────
    if endcustomer is True:
        factors.append(
            RateFactorOut(
                label="Endkunde direkt",
                factor=_ENDCUSTOMER_FACTOR,
                evidence="endcustomer=true",
            )
        )
    elif endcustomer is False:
        factors.append(
            RateFactorOut(
                label="Vermittler (Broker)",
                factor=1.00,
                evidence="endcustomer=false",
            )
        )
    else:
        uncertainties.append("Bezug (Endkunde/Vermittler) unbekannt – Bezugsfaktor 1,00 (Unsicherheit).")

    # ── Laufzeit ─────────────────────────────────────────────────────────
    months = _parse_month_count(duration or "")
    if months is None:
        uncertainties.append("Laufzeit nicht erkannt – Laufzeitfaktor 1,00 (Unsicherheit).")
    elif months > _LONG_PROJECT_MONTHS:
        factors.append(RateFactorOut(label="Laufzeit > 6 Monate", factor=0.95, evidence=duration))
    elif months < _SHORT_PROJECT_MONTHS:
        factors.append(RateFactorOut(label="Laufzeit < 3 Monate", factor=1.05, evidence=duration))
    else:
        factors.append(RateFactorOut(label=f"Laufzeit {months} Monate", factor=1.00, evidence=duration))

    # ── Start (nur explizite Sofort-Marker) ──────────────────────────────
    start_text = (my_start_date or start_date or "").strip().lower()
    if any(marker in start_text for marker in _IMMEDIATE_START_MARKERS):
        factors.append(
            RateFactorOut(
                label="Start sofort (≤ 4 Wochen)",
                factor=1.05,
                evidence=my_start_date or start_date,
            )
        )

    # ── Nicht-deterministische Faktoren (Semantik nötig) ─────────────────
    uncertainties.append("Scarce-Kern (produktionsreife Agentic/RAG + Evals) nicht bewertet – Faktor 1,00.")
    uncertainties.append("Regulierte Domäne (Pharma/GxP/Finanz) nicht bewertet – Faktor 1,00.")
    uncertainties.append("100 % Remote: seit 2026 Faktor 1,00 (kein Aufschlag).")

    multiplier = 1.0
    for factor in factors:
        multiplier *= factor.factor

    deckel = max(round(base_rate * multiplier), 0)
    target = max(base_rate, deckel)

    return ProjectRateEstimateOut(
        base_rate=base_rate,
        hourly_rate=deckel,
        target_rate=target,
        factors=factors,
        uncertainties=uncertainties,
    )


async def estimate_and_persist(
    db: AsyncSession, project_id: int, bridge: ApplicationBridgePort
) -> ProjectRateEstimateOut:
    """Estimate a project's offer hourly rate and persist ``hourly_rate``.

    Master-only: slaves (``canonical_id`` not NULL) are rejected. Requires the
    application profile base rate (Schicht 1), read through the shared
    application-bridge port.

    Args:
        db: Active gjo_se_com database connection.
        project_id: Primary key of the master project.
        bridge: Application-bridge port (profile base rate).

    Returns:
        The estimate incl. applied factors and uncertainties.

    Raises:
        HTTPException 404: Project or application profile not found.
        HTTPException 422: Project is a slave or the profile base rate is unset.
    """
    project = await project_repository.get_by_id(db, project_id)
    if project is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found.",
        )
    if project.canonical_id is not None:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Stundensatz-Schätzung nur für Master-Projekte (canonical_id is NULL).",
        )

    base_rate_value = await bridge.get_profile_base_rate(db)
    if base_rate_value is None:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Basisrate im Application-Profil nicht gesetzt (application_profile.hourly_rate).",
        )

    base_rate = round(base_rate_value)
    estimate = estimate_rate(
        base_rate=base_rate,
        country=project.country,
        endcustomer=project.endcustomer,
        duration=project.duration,
        start_date=project.start_date,
        my_start_date=project.my_start_date,
    )

    _ = await project_write_repository.set_hourly_rate(db, project_id, estimate.hourly_rate)
    logger.info(
        "Project hourly_rate estimated: id=%s base=%s rate=%s",
        project_id,
        base_rate,
        estimate.hourly_rate,
    )
    return estimate
