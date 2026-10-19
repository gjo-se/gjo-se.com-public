"""Frozen read/draft records for Tag and Taggable (gjo_se_com).

The repositories map the ``Tag``/``Taggable`` ORM rows to these dataclasses so
the service layer never imports ``app.shared.tagging.models`` (Achse 2:
``services`` > ``repositories``; strict K2).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class TagDraft:
    """Persistable tag fields used to create a new tag.

    Attributes:
        name: Display name.
        slug: Resolved unique slug.
        category: Tag category.
        color_token: UI colour token.
        description: Optional description.
        sort_order: Sort position within the category.
        scope: Entity types the tag applies to (``None`` = global).
    """

    name: str
    slug: str
    category: str
    color_token: str
    description: str | None
    sort_order: int
    scope: list[str] | None


@dataclass(slots=True)
class TagRecord:
    """A tag definition as a mutable service-boundary record.

    Attributes:
        id: Primary key of the tag.
        name: Display name.
        slug: Unique slug.
        category: Tag category.
        color_token: UI colour token.
        description: Optional description.
        sort_order: Sort position within the category.
        scope: Entity types the tag applies to (``None`` = global).
        created_at: Creation timestamp (UTC).
        updated_at: Last update timestamp (UTC).
    """

    id: int
    name: str
    slug: str
    category: str
    color_token: str
    description: str | None
    sort_order: int
    scope: list[str] | None
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True, slots=True)
class TaggableRecord:
    """A polymorphic tag assignment with its resolved tag.

    Attributes:
        tag_id: Referenced tag id.
        taggable_type: Entity type discriminator.
        taggable_id: Entity primary key.
        tag: The resolved tag definition.
    """

    tag_id: int
    taggable_type: str
    taggable_id: int
    tag: TagRecord
