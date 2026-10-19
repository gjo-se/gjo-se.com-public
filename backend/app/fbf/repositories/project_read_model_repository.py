"""Read-models for normalised Project entries (AIScope domain).

Owns the :class:`ProjectRow` view projection and its DTO factory. Split out of
``project_repository`` (God-File-Refactor) so the read, write and canonical
modules share one definition without importing each other's query logic.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import partial

from app.fbf.schemas.project_schemas import ProjectOut
from app.shared.db_access import repository_helpers


@dataclass
class ProjectRow:
    """Read-Model: Projekt-DTO + per Join/Subquery abgeleitete View-Felder.

    Trägt ``status``/``status_color_token``/``slave_count``/``freelancermap_id``
    explizit, statt sie als dynamische Attribute an die ORM-Entity zu hängen
    (ORM = Schreibmodell, Read-Model = Projektion).
    """

    project: ProjectOut
    status: str | None = None
    status_color_token: str | None = None
    freelancermap_id: int | None = None
    slave_count: int = 0


_to_out = partial(repository_helpers.to_out, dto_cls=ProjectOut)
