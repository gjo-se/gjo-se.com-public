"""Pydantic-Schemas fuer CRM-Personen (Person)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.crm.schemas.address_schemas import AddressOut
from app.crm.schemas.company_schemas import _normalize_url
from app.shared.tagging.schemas.tag_schemas import TagOut


class PersonCreate(BaseModel):
    """Request-Body fuer POST /crm/persons – legt eine neue Person an.

    ``email`` ist optional. Fehlt eine echte Adresse, bleibt sie ``NULL``
    (kein Platzhalter) – die Person kann spaeter manuell ergaenzt werden.
    ``company_domain`` ist ein optionaler Trigger-Parameter fuer die
    Hunter.io-Datenanreicherung.

    Attributes:
        email: E-Mail-Adresse (optional, unique, E-Mail-Format validiert).
        first_name: Vorname.
        last_name: Nachname.
        phone: Telefonnummer.
        role: Rolle / Position.
        department: Abteilung.
        linkedin_url: LinkedIn-Profil.
        xing_url: XING-Profil.
        address_id: Optionaler FK auf crm_address (Standort-Zuordnung).
        company_domain: Optionale Company-Domain fuer Enrichment (nicht persistiert).
    """

    email: EmailStr | None = Field(default=None, max_length=255)
    first_name: str | None = Field(default=None, max_length=255)
    last_name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=64)
    role: str | None = Field(default=None, max_length=255)
    department: str | None = Field(default=None, max_length=255)
    linkedin_url: str | None = Field(default=None, max_length=500)
    xing_url: str | None = Field(default=None, max_length=500)
    address_id: int | None = None
    company_domain: str | None = Field(default=None, max_length=255)

    # ── URL normalisation ──────────────────────────────────────────────────
    _norm_linkedin = field_validator("linkedin_url", mode="before")(_normalize_url)
    _norm_xing = field_validator("xing_url", mode="before")(_normalize_url)


class PersonUpdate(BaseModel):
    """Request-Body fuer PUT /crm/persons/{id} – aktualisiert eine Person (PATCH-Style).

    Alle Felder sind optional – nur gesetzte Felder werden aktualisiert.
    ``email`` ist als ``str | None`` typisiert (kein ``EmailStr``) –
    die E-Mail-Validierung erfolgt im Service-Layer.

    Attributes:
        email: E-Mail-Adresse (optional).
        first_name: Vorname.
        last_name: Nachname.
        phone: Telefonnummer.
        role: Rolle / Position.
        department: Abteilung.
        linkedin_url: LinkedIn-Profil.
        xing_url: XING-Profil.
        address_id: Optionaler FK auf crm_address (null = Adresse entfernen).
    """

    email: str | None = Field(default=None, max_length=255)
    first_name: str | None = Field(default=None, max_length=255)
    last_name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=64)
    role: str | None = Field(default=None, max_length=255)
    department: str | None = Field(default=None, max_length=255)
    linkedin_url: str | None = Field(default=None, max_length=500)
    xing_url: str | None = Field(default=None, max_length=500)
    address_id: int | None = None

    # ── URL normalisation ──────────────────────────────────────────────────
    _norm_linkedin = field_validator("linkedin_url", mode="before")(_normalize_url)
    _norm_xing = field_validator("xing_url", mode="before")(_normalize_url)


class PersonOut(BaseModel):
    """Response-Body fuer GET /crm/persons – liefert alle Personendaten.

    Attributes:
        id: Primaerschluessel (Integer).
        email: E-Mail-Adresse (NULL, wenn keine echte Adresse bekannt ist).
        first_name: Vorname.
        last_name: Nachname.
        phone: Telefonnummer.
        role: Rolle / Position.
        department: Abteilung.
        linkedin_url: LinkedIn-Profil.
        xing_url: XING-Profil.
        address_id: Optionaler FK auf crm_address (Standort-Zuordnung).
        address: Expandierte Adressdaten (via FK, nullable).
        primary_company_id: ID der ersten verknuepften Firma (fuer Listendarstellung).
        primary_company_name: Name der ersten verknuepften Firma (fuer Listendarstellung).
        primary_company_city: Stadt der primaeren Adresse der verknuepften Firma.
        primary_company_email: Generische E-Mail der verknuepften Firma
            (Fallback, wenn die Person keine persoenliche Adresse hat).
        has_dependents: True wenn Projekt-Verknuepfungen bestehen (Loeschen blockiert).
        confidence_score: Hunter.io Verifikations-Score (0-100, nullable).
        enrichment_source: Quelle des Enrichments (z.B. "hunter", nullable).
        contact_blocked_reason: Begruendung der Kontaktsperre.
        status: Core-Status (active/rejected/favorite) via core_statusable.
        status_color_token: Color-Token (green/red/yellow).
        created_at: Anlage-Zeitstempel (UTC).
        updated_at: Letzter Update-Zeitstempel (UTC).
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    role: str | None = None
    department: str | None = None
    linkedin_url: str | None = None
    xing_url: str | None = None
    address_id: int | None = None
    address: AddressOut | None = None
    primary_company_id: int | None = None
    primary_company_name: str | None = None
    primary_company_city: str | None = None
    primary_company_email: str | None = None
    has_dependents: bool = False
    confidence_score: int | None = None
    enrichment_source: str | None = None
    contact_blocked_reason: str | None = None
    status: str | None = None
    status_color_token: str | None = None
    tags: list[TagOut] = []
    created_at: datetime
    updated_at: datetime
