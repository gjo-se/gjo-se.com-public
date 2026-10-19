"""Service↔repository boundary record for trigger observation.

The repository maps aggregated ``shared_call_log`` rows to
:class:`TriggerObservationRecord` so ``app.shared.llm_gateway.services`` stays
free of ``app.shared.llm_gateway.models`` imports (Achse 2: ``services`` >
``repositories``).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True, slots=True)
class TriggerObservationRecord:
    """One aggregated trigger-observation row from the call log.

    Attributes:
        trigger: Trigger label.
        count: Number of calls observed with this trigger.
        first_seen: Earliest observation timestamp.
        last_seen: Most recent observation timestamp.
    """

    trigger: str
    count: int
    first_seen: datetime | None
    last_seen: datetime | None
