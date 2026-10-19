"""Service↔repository boundary records for user-scoped LLM API keys.

The repository maps ``shared_user_api_key`` rows (optionally joined with the
provider name) to :class:`UserApiKeyRecord` so
``app.shared.llm_gateway.services`` stays free of
``app.shared.llm_gateway.models`` imports (Achse 2: ``services`` >
``repositories``). The ``key_value`` stays encrypted on the record; the service
decrypts it at the boundary.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True, slots=True)
class UserApiKeyRecord:
    """Immutable snapshot of one ``shared_user_api_key`` row.

    Attributes:
        id: Primary key.
        user_id: ID of the owning user.
        provider_id: FK to the provider row.
        label: Optional human-readable label.
        valid_at: Timestamp of the last successful validation, or ``None``.
        validation_error: Error text of the last failed validation, or ``None``.
        created_at: Row creation timestamp.
        key_value: Encrypted API key (never the plaintext value).
        provider_name: Provider identifier when the row was joined with the
            provider table, else ``None``.
    """

    id: int
    user_id: int
    provider_id: int
    label: str | None
    valid_at: datetime | None
    validation_error: str | None
    created_at: datetime
    key_value: str
    provider_name: str | None = None
