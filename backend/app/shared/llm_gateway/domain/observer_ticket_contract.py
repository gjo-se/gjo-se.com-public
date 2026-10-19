"""Service↔repository boundary records for observer tickets.

The repository maps ``shared_observer_ticket`` rows to
:class:`ObserverTicketRecord` so ``app.shared.llm_gateway.services`` stays free
of ``app.shared.llm_gateway.models`` imports (Achse 2: ``services`` >
``repositories``).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(frozen=True, slots=True)
class ObserverTicketRecord:
    """Immutable snapshot of one ``shared_observer_ticket`` row.

    Attributes:
        id: Primary key.
        ticket_type: Ticket classification string.
        severity: Severity string.
        task: LLM task identifier.
        anomaly_details: JSON anomaly detail payload, when present.
        diagnosis: Human-readable diagnosis.
        langfuse_trace_url: Deep-link to the LangFuse trace, when present.
        status: Current lifecycle status string.
        created_at: Row creation timestamp.
        resolved_at: Timestamp when resolved/dismissed, when present.
    """

    id: int
    ticket_type: str
    severity: str
    task: str
    anomaly_details: dict[str, Any] | None
    diagnosis: str | None
    langfuse_trace_url: str | None
    status: str
    created_at: datetime
    resolved_at: datetime | None
