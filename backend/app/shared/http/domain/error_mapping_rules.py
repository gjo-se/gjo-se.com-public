"""Domänenfreies Mapping von Service-Exceptions auf FastAPI-``HTTPException``.

Kapselt das in Routern wiederholte Muster
``except ValueError/FileNotFoundError -> HTTPException``. Der Owner ist
``app.shared.http`` (domänenfrei); Router importieren die Helfer, statt den
``try/except``-Block zu kopieren.
"""

from __future__ import annotations

from fastapi import HTTPException


def value_error_to_http(
    exc: ValueError,
    *,
    not_found_status: int = 404,
    conflict_status: int | None = None,
    conflict_markers: tuple[str, ...] = ("already exists",),
) -> HTTPException:
    """Maps a service ``ValueError`` to a 404/409/422 ``HTTPException``.

    Keyword-based, verhaltensgleich zum kopierten Router-Muster:
    ``"not found"`` → ``not_found_status``, ein Konflikt-Marker →
    ``conflict_status`` (falls gesetzt), sonst 422.

    Args:
        exc: Die aus dem Service propagierte ``ValueError``.
        not_found_status: Status für ``"not found"`` (Default 404).
        conflict_status: Status für Konflikt-Marker (``None`` = kein Konflikt-Zweig).
        conflict_markers: Lowercase-Teilstrings, die einen Konflikt markieren.

    Returns:
        Die passende ``HTTPException`` (Aufrufer: ``raise ... from exc``).
    """
    detail = str(exc)
    lowered = detail.lower()
    if "not found" in lowered:
        return HTTPException(status_code=not_found_status, detail=detail)
    if conflict_status is not None and any(marker in lowered for marker in conflict_markers):
        return HTTPException(status_code=conflict_status, detail=detail)
    return HTTPException(status_code=422, detail=detail)


def file_not_found_to_http(exc: FileNotFoundError) -> HTTPException:
    """Maps a ``FileNotFoundError`` to a 500 ``HTTPException``.

    Args:
        exc: Der aus dem Service propagierte ``FileNotFoundError``.

    Returns:
        ``HTTPException`` mit Status 500 und dem Exception-Text als Detail.
    """
    return HTTPException(status_code=500, detail=str(exc))
