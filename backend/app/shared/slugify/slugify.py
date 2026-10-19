"""Unified slug normalization (kebab-case) with German umlaut mapping.

SSOT for all slug generation across the core API – backfill migrations,
auto-slug on create and catalog source mapper fallback.

Example:
    >>> slugify("Risk High")
    'risk-high'
    >>> slugify("Größter Ärgernis")
    'groesster-aergernis'
"""

import re
import unicodedata

# German umlauts are mapped BEFORE NFKD normalization so they survive as
# multi-character sequences (ä→ae) instead of being stripped to a bare "a".
_UMLAUT_MAP: dict[str, str] = {
    "ä": "ae",
    "ö": "oe",
    "ü": "ue",
    "Ä": "Ae",
    "Ö": "Oe",
    "Ü": "Ue",
    "ß": "ss",
}


def slugify(text: str | None, max_length: int = 100) -> str:
    """Normalize *text* into a lowercase kebab-case slug.

    German umlauts are replaced explicitly (ä→ae, ö→oe, ü→ue, ß→ss) before
    NFKD normalization strips remaining diacritics. Non-alphanumeric runs
    collapse into a single ``-``; leading/trailing ``-`` are removed.

    Args:
        text: Input string. ``None`` or empty → ``""``.
        max_length: Maximum slug length (default 100). A trailing ``-``
            produced by truncation is removed.

    Returns:
        Normalized slug, never ``None``.
    """
    if not text:
        return ""

    for umlaut, replacement in _UMLAUT_MAP.items():
        text = text.replace(umlaut, replacement)

    normalized = unicodedata.normalize("NFKD", text)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    lowered = ascii_only.lower()
    kebab = re.sub(r"[^a-z0-9]+", "-", lowered)
    trimmed = kebab.strip("-")

    if len(trimmed) > max_length:
        trimmed = trimmed[:max_length].rstrip("-")

    return trimmed
