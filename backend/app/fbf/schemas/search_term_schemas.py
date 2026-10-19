"""Pydantic schemas for SearchTerm (create / update / out)."""

from pydantic import BaseModel, ConfigDict, Field


class SearchTermCreate(BaseModel):
    """Eingabe-Schema fuer POST /admin/fbf/search-term.

    Attributes:
        name: Suchbegriff (eindeutig, max. 255 Zeichen).
    """

    name: str = Field(..., min_length=1, max_length=255)


class SearchTermUpdate(BaseModel):
    """Eingabe-Schema fuer PUT /admin/fbf/search-term/{id}.

    Alle Felder sind optional – nur uebergebene Felder werden aktualisiert.

    Attributes:
        name: Neuer Suchbegriff (optional).
    """

    name: str | None = Field(default=None, min_length=1, max_length=255)


class SearchTermOut(BaseModel):
    """Ausgabe-Schema fuer einen SearchTerm.

    Attributes:
        id: Primaerschluessel.
        name: Suchbegriff.
        reference_count: Anzahl referenzierender Freelancermap-Einträge.
        status: Core-Status (active/inactive) via core_statusable.
        status_color_token: Color-Token (green/gray).
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    reference_count: int = 0
    status: str | None = None
    status_color_token: str | None = None


class SearchTermAdminOut(SearchTermOut):
    """Admin-Ausgabe-Schema – identisch zu SearchTermOut (Status via core_statusable)."""
