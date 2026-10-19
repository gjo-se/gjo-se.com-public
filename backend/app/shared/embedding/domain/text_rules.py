"""Text-normalisation helpers shared by the embedding text builders."""

from __future__ import annotations


def clean_str(value: str | None) -> str | None:
    """Strip and return string, or None if empty/None.

    Args:
        value: Raw string value, or ``None``.

    Returns:
        The stripped value, or ``None`` when the input is ``None`` or blank.
    """
    if value is None:
        return None
    stripped = value.strip()
    return stripped if stripped else None
