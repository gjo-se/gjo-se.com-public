"""Request-level dependencies for the viscera bounded context."""

from __future__ import annotations

from fastapi import HTTPException

from app.viscera.repositories.file.architecture_repository import ARCHITECTURE_SOURCES


def validate_architecture_source(source: str) -> None:
    """Validate the ``source`` query param against known architecture sources.

    Args:
        source: Candidate architecture source identifier.

    Raises:
        HTTPException: 422 if *source* is not a known architecture source.
    """
    if source not in ARCHITECTURE_SOURCES:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Unbekannte Architecture-Source '{source}'. Gültige Werte: {', '.join(sorted(ARCHITECTURE_SOURCES))}"
            ),
        )
