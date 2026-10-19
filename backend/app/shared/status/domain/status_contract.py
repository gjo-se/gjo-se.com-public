"""Frozen read records for Status and Statusable (gjo_se_com).

The repositories map the ``Status``/``Statusable`` ORM rows to these dataclasses
so the service layer never imports ``app.shared.status.models`` (Achse 2:
``services`` > ``repositories``; strict K2).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True, slots=True)
class StatusRecord:
    """A status definition as a service-boundary record.

    Attributes:
        id: Primary key of the status.
        name: Display name.
        slug: Unique slug.
        category: Status category.
        color_token: UI colour token.
        description: Optional description.
        sort_order: Sort position within the category.
        scope: Entity types the status applies to (``None`` = global).
        created_at: Creation timestamp (UTC).
        updated_at: Last update timestamp (UTC).
    """

    id: int
    name: str
    slug: str
    category: str
    color_token: str
    description: str | None
    sort_order: float
    scope: list[str] | None
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True, slots=True)
class StatusableRecord:
    """A polymorphic status assignment with its resolved status.

    Attributes:
        id: Primary key of the junction row.
        status_id: Referenced status id.
        statusable_type: Entity type discriminator.
        statusable_id: Entity primary key.
        status: The resolved status definition.
    """

    id: int
    status_id: int
    statusable_type: str
    statusable_id: int
    status: StatusRecord
