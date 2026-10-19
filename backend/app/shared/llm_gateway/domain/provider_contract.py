"""Service↔repository boundary records for LLM providers.

The repository maps ``shared_provider`` rows (and their user-key join) to
:class:`ProviderRecord` / :class:`ProviderStatusRecord` so
``app.shared.llm_gateway.services`` stays free of
``app.shared.llm_gateway.models`` imports (Achse 2: ``services`` >
``repositories``).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True, slots=True)
class ProviderRecord:
    """Immutable snapshot of one ``shared_provider`` row.

    Attributes:
        id: Primary key.
        name: Provider identifier, e.g. ``'openai'``.
        display_name: Human-readable provider name.
    """

    id: int
    name: str
    display_name: str


@dataclass(frozen=True, slots=True)
class ProviderStatusRecord:
    """A provider row joined with the requesting user's key metadata.

    Attributes:
        id: Primary key of the provider row.
        name: Provider identifier.
        display_name: Human-readable provider name.
        key_id: Primary key of the user's key row, or ``None`` when absent.
        valid_at: Timestamp of the last successful validation, or ``None``.
        label: Optional label of the stored key.
    """

    id: int
    name: str
    display_name: str
    key_id: int | None
    valid_at: datetime | None
    label: str | None
