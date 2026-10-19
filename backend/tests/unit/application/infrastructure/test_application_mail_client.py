"""Unit-Tests fuer die Anrede-Logik des Bewerbungs-Mailservice.

Deckt ``build_greeting`` ab: persoenliche Anrede bei echtem Namen, generische
Anrede bei leerem Namen, Platzhalter (``unbekannt``) und Firmennamen als
Kontakt-Feld.
"""

from __future__ import annotations

import pytest

from app.application.infrastructure.application_mail_client import (
    GENERIC_GREETING,
    build_greeting,
)

pytestmark = pytest.mark.unit


def test_build_greeting_returns_personal_greeting_for_real_name() -> None:
    """Ein echter Personenname ergibt die persoenliche Anrede."""
    # Arrange
    recipient_name = "Stefan Berntheisel"

    # Act
    greeting = build_greeting(recipient_name)

    # Assert
    assert greeting == "Guten Tag, Stefan Berntheisel,"


def test_build_greeting_returns_generic_greeting_for_empty_name() -> None:
    """Ein leerer Name ergibt die generische Anrede."""
    # Arrange
    recipient_name = ""

    # Act
    greeting = build_greeting(recipient_name)

    # Assert
    assert greeting == GENERIC_GREETING


def test_build_greeting_returns_generic_greeting_for_none_name() -> None:
    """Ein fehlender Name (NULL) ergibt die generische Anrede."""
    # Arrange
    recipient_name = None

    # Act
    greeting = build_greeting(recipient_name)

    # Assert
    assert greeting == GENERIC_GREETING


def test_build_greeting_returns_generic_greeting_for_unknown_placeholder() -> None:
    """Der Platzhalter 'unbekannt' ergibt die generische Anrede (case-insensitive)."""
    # Arrange
    recipient_name = "Unbekannt"

    # Act
    greeting = build_greeting(recipient_name)

    # Assert
    assert greeting == GENERIC_GREETING


def test_build_greeting_returns_generic_greeting_when_name_equals_company() -> None:
    """Ein Name, der der Firma entspricht, ergibt die generische Anrede."""
    # Arrange
    recipient_name = "consultingheads GmbH"
    company_name = "consultingheads GmbH"

    # Act
    greeting = build_greeting(recipient_name, company_name)

    # Assert
    assert greeting == GENERIC_GREETING


def test_build_greeting_returns_personal_greeting_when_name_differs_from_company() -> None:
    """Ein Name, der von der Firma abweicht, bleibt eine persoenliche Anrede."""
    # Arrange
    recipient_name = "Stefan Berntheisel"
    company_name = "consultingheads GmbH"

    # Act
    greeting = build_greeting(recipient_name, company_name)

    # Assert
    assert greeting == "Guten Tag, Stefan Berntheisel,"
