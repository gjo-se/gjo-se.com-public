"""Enrichment-Service: orchestriert Hunter.io-Lookups und schreibt Ergebnisse in Person.

Wird von Person-Create-Integration (Ticket #1226) und Projekt-Bewerbungs-Endpoint
(Ticket #1227) verwendet. Kein eigener API-Endpoint.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import structlog

from app.crm.infrastructure.hunter_client import HunterClient, HunterClientFactory, HunterError
from app.crm.repositories import person_repository
from app.crm.schemas.person_schemas import PersonOut
from app.shared.config.config import settings
from app.shared.db_access.session_types import AsyncSession

logger = structlog.get_logger(__name__)

SKIP_SCORE_THRESHOLD = 90


def _has_confident_email(person: PersonOut) -> bool:
    """Return whether the person already has an email above the skip threshold."""
    return bool(person.email) and (person.confidence_score or 0) > SKIP_SCORE_THRESHOLD


def _skip_reason(person: PersonOut, domain: str) -> str | None:
    """Return the domain/email-based skip reason, or ``None`` to proceed.

    The name-field guard is checked in the caller (for type narrowing).

    Args:
        person: The person to enrich.
        domain: The already-stripped company domain.

    Returns:
        A human-readable skip reason, or ``None`` when enrichment may proceed.
    """
    if not domain:
        return "empty company_domain"
    if _has_confident_email(person):
        return f"email={person.email} with score={person.confidence_score} > {SKIP_SCORE_THRESHOLD}"
    return None


def _report_no_result(
    on_error: Callable[[HunterError], None] | None,
    client: HunterClient,
    first_name: str,
    last_name: str,
    domain: str,
) -> None:
    """Forward a handled Hunter error and log the empty lookup result.

    Args:
        on_error: Optional callback receiving the handled Hunter error.
        client: The Hunter client that performed the lookup.
        first_name: The looked-up first name.
        last_name: The looked-up last name.
        domain: The company domain that was queried.
    """
    if on_error is not None and client.last_error is not None:
        on_error(client.last_error)
    logger.info("Enrichment: no result for %s %s @ %s", first_name, last_name, domain)


async def _apply_result(db: AsyncSession, person: PersonOut, result: dict[str, Any]) -> PersonOut:
    """Persist the Hunter result on the person and apply search-url defaults.

    Args:
        db: Active DB session.
        person: The person being enriched.
        result: The raw Hunter email-finder payload.

    Returns:
        The updated person DTO (or the input person when it vanished).
    """
    updated = await person_repository.apply_email_finder_result(db, person.id, result)
    if updated is None:
        return person
    defaulted = await person_repository.apply_person_search_url_defaults(db, person.id)
    return defaulted if defaulted is not None else updated


async def enrich_person(
    db: AsyncSession,
    person: PersonOut,
    company_domain: str,
    *,
    hunter_client_factory: HunterClientFactory | None = None,
    on_error: Callable[[HunterError], None] | None = None,
) -> PersonOut:
    """Reichert eine Person via Hunter.io an, falls sinnvoll.

    Guards (kein Enrichment, Person unveraendert):
        - ``first_name``, ``last_name`` oder ``company_domain`` fehlt.
        - ``person.email`` ist bereits gesetzt UND ``confidence_score > 90``.
        - Kein ``HUNTER_API_KEY`` in den Settings konfiguriert.

    Bei erfolgreichem Lookup werden ``email`` (falls nicht gesetzt),
    ``confidence_score`` und ``enrichment_source`` auf der Person gesetzt und
    persistiert.

    Args:
        db: Aktive DB-Session.
        person: Die zuvor angelegte (oder geladene) Person als DTO.
        company_domain: Company-Domain fuer den Email-Finder-Lookup
            (z.B. ``"example.com"``).
        hunter_client_factory: Composition-root provider that builds the
            :class:`HunterClient` from the API key. Defaults to the module-level
            ``HunterClient`` when omitted so the external boundary stays
            substitutable.
        on_error: Optionaler Callback, der bei einem behandelten Hunter-Fehler
            (z.B. erschoepftes Kontingent) mit dem :class:`HunterError`
            aufgerufen wird. Ohne Callback bleibt das Verhalten unveraendert
            (nur Logging, graceful degradation).

    Returns:
        Die aktualisierte Person als DTO (ggf. mit Enrichment-Daten angereichert).
    """
    first_name = person.first_name
    last_name = person.last_name
    if not first_name or not last_name:
        logger.debug("Enrichment skipped: name fields missing for %s", person.id)
        return person

    domain = (company_domain or "").strip()
    skip_reason = _skip_reason(person, domain)
    if skip_reason is not None:
        logger.debug("Enrichment skipped: %s for %s", skip_reason, person.id)
        return person

    api_key = settings.HUNTER_API_KEY
    if not api_key:
        logger.warning("Enrichment skipped: HUNTER_API_KEY not configured")
        return person

    client = (hunter_client_factory or HunterClient)(api_key=api_key)
    result = await client.find_email(first_name, last_name, domain)
    if result is None or not result.get("email"):
        _report_no_result(on_error, client, first_name, last_name, domain)
        return person

    updated = await _apply_result(db, person, result)
    logger.info(
        "Enrichment successful for %s %s: email=%s score=%s role=%s",
        first_name,
        last_name,
        updated.email,
        updated.confidence_score,
        updated.role,
    )
    return updated
