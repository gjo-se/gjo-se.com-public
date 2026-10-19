"""Pydantic-Schemas fuer CRM-Firmen (Company)."""

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.shared.tagging.schemas.tag_schemas import TagOut


def _normalize_url(value: str | None) -> str | None:
    """Stellt sicher, dass eine URL mit ``https://`` beginnt (wenn nicht leer)."""
    if not value:
        return None
    v = value.strip()
    if not v:
        return None
    if v.startswith(("http://", "https://")):
        return v
    return f"https://{v}"


class CompanyCreate(BaseModel):
    """Request-Body fuer POST /crm/companies – legt eine neue Firma an.

    Attributes:
        name: Firmenname (Pflicht, 1–255 Zeichen).
        company_type: Art der Firma (``endcustomer`` = Endkunde, ``broker`` = Vermittler).
        email: Generische Firmen-E-Mail (optional, z. B. ``karriere@``).
        website: Firmen-Website URL.
        industry: Branchen-Klassifikation.
        company_size: Groessenkategorie (z.B. ``1-10``, ``11-50``).
        founded_year: Gruendungsjahr (1800–2100).
        linkedin_url: LinkedIn-Firmenseite.
        xing_url: XING-Firmenseite.
        kununu_url: Kununu-Firmenseite.
        kununu_score: Kununu-Bewertung (0.00–5.00).
    """

    name: str = Field(min_length=1, max_length=255)
    company_type: Literal["endcustomer", "broker"] | None = Field(default=None)
    email: EmailStr | None = Field(default=None, max_length=255)
    website: str | None = Field(default=None)
    industry: str | None = Field(default=None)
    company_size: str | None = Field(default=None)
    founded_year: int | None = Field(default=None, ge=1800, le=2100)
    linkedin_url: str | None = Field(default=None)
    xing_url: str | None = Field(default=None)
    kununu_url: str | None = Field(default=None)
    kununu_score: Decimal | None = Field(default=None, ge=0, le=5, decimal_places=2)

    # ── URL normalisation ──────────────────────────────────────────────────
    _norm_website = field_validator("website", mode="before")(_normalize_url)
    _norm_linkedin = field_validator("linkedin_url", mode="before")(_normalize_url)
    _norm_xing = field_validator("xing_url", mode="before")(_normalize_url)
    _norm_kununu = field_validator("kununu_url", mode="before")(_normalize_url)


class CompanyUpdate(BaseModel):
    """Request-Body fuer PUT /crm/companies/{id} – aktualisiert eine Firma (PATCH-Style).

    Alle Felder sind optional – nur gesetzte Felder werden aktualisiert.

    Attributes:
        name: Firmenname (1–255 Zeichen, optional).
        company_type: Art der Firma (``endcustomer`` | ``broker``, optional).
        email: Generische Firmen-E-Mail (optional).
        website: Firmen-Website URL.
        industry: Branchen-Klassifikation.
        company_size: Groessenkategorie.
        founded_year: Gruendungsjahr (1800–2100).
        linkedin_url: LinkedIn-Firmenseite.
        xing_url: XING-Firmenseite.
        kununu_url: Kununu-Firmenseite.
        kununu_score: Kununu-Bewertung (0.00–5.00).
    """

    name: str | None = Field(default=None, min_length=1, max_length=255)
    company_type: Literal["endcustomer", "broker"] | None = Field(default=None)
    email: str | None = Field(default=None, max_length=255)
    website: str | None = Field(default=None)
    industry: str | None = Field(default=None)
    company_size: str | None = Field(default=None)
    founded_year: int | None = Field(default=None, ge=1800, le=2100)
    linkedin_url: str | None = Field(default=None)
    xing_url: str | None = Field(default=None)
    kununu_url: str | None = Field(default=None)
    kununu_score: Decimal | None = Field(default=None, ge=0, le=5, decimal_places=2)

    # ── URL normalisation ──────────────────────────────────────────────────
    _norm_website = field_validator("website", mode="before")(_normalize_url)
    _norm_linkedin = field_validator("linkedin_url", mode="before")(_normalize_url)
    _norm_xing = field_validator("xing_url", mode="before")(_normalize_url)
    _norm_kununu = field_validator("kununu_url", mode="before")(_normalize_url)


class CompanyOut(BaseModel):
    """Response-Body fuer GET /crm/companies – liefert alle Firmendaten.

    Attributes:
        id: Primaerschluessel (Integer).
        name: Firmenname.
        company_type: Art der Firma (``endcustomer`` | ``broker`` | ``None``).
        email: Generische Firmen-E-Mail (Fallback beim Versand, nullable).
        website: Firmen-Website URL.
        industry: Branchen-Klassifikation.
        company_size: Groessenkategorie.
        founded_year: Gruendungsjahr.
        linkedin_url: LinkedIn-Firmenseite.
        xing_url: XING-Firmenseite.
        kununu_url: Kununu-Firmenseite.
        kununu_score: Kununu-Bewertung (0.00–5.00).
        contact_blocked_reason: Begruendung der Kontaktsperre.
        status: Core-Status (active/rejected/favorite) via core_statusable.
        status_color_token: Color-Token (green/red/yellow).
        primary_city: Stadt aus der primaeren Adresse (fuer Listendarstellung).
        primary_country: Land aus der primaeren Adresse (fuer Listendarstellung).
        created_at: Anlage-Zeitstempel (UTC).
        updated_at: Letzter Update-Zeitstempel (UTC).
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    company_type: str | None = None
    email: str | None = None
    website: str | None = None
    industry: str | None = None
    company_size: str | None = None
    founded_year: int | None = None
    linkedin_url: str | None = None
    xing_url: str | None = None
    kununu_url: str | None = None
    kununu_score: Decimal | None = None
    contact_blocked_reason: str | None = None
    status: str | None = None
    status_color_token: str | None = None
    primary_city: str | None = None
    primary_country: str | None = None
    has_dependents: bool = False
    tags: list[TagOut] = []
    created_at: datetime
    updated_at: datetime
