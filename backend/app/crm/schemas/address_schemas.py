"""Pydantic-Schemas fuer CRM-Adressen (Address)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AddressCreate(BaseModel):
    """Request-Body fuer POST /crm/companies/{id}/addresses – legt eine neue Adresse an.

    ``crm_company_id`` ist Pflicht – die Adresse ist Kind der Firma.
    Die FK-Validierung (Firma existiert?) erfolgt im Service-Layer.

    Attributes:
        crm_company_id: FK zur uebergeordneten Firma (Integer, Pflicht).
        label: Adress-Label (z.B. ``HQ``, ``Branch``, ``Billing``).
        street: Strasse und Hausnummer.
        zip: Postleitzahl.
        city: Stadt.
        country: Land.
        is_primary: Standard-Adresse der Firma (Default ``False``).
    """

    crm_company_id: int
    label: str | None = Field(default=None, max_length=64)
    street: str | None = Field(default=None)
    zip: str | None = Field(default=None)
    city: str | None = Field(default=None)
    country: str | None = Field(default=None)
    is_primary: bool = False


class AddressUpdate(BaseModel):
    """Request-Body fuer PUT /crm/addresses/{id} – aktualisiert eine Adresse (PATCH-Style).

    Alle Felder sind optional – nur gesetzte Felder werden aktualisiert.
    ``crm_company_id`` ist nicht aenderbar (Owning-FK ist stabil).

    Attributes:
        label: Adress-Label (z.B. ``HQ``, ``Branch``, ``Billing``).
        street: Strasse und Hausnummer.
        zip: Postleitzahl.
        city: Stadt.
        country: Land.
        is_primary: Standard-Adresse der Firma.
    """

    label: str | None = Field(default=None, max_length=64)
    street: str | None = Field(default=None)
    zip: str | None = Field(default=None)
    city: str | None = Field(default=None)
    country: str | None = Field(default=None)
    is_primary: bool | None = Field(default=None)


class AddressOut(BaseModel):
    """Read model for a CRM company address returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    crm_company_id: int
    label: str | None = None
    street: str | None = None
    zip: str | None = None
    city: str | None = None
    country: str | None = None
    is_primary: bool = False
    created_at: datetime
    updated_at: datetime
