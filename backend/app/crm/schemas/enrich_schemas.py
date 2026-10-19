"""Pydantic-Schemas fuer CRM-Enrichment-Requests."""

from typing import Literal

from pydantic import BaseModel, Field


class CompanyEnrichRequest(BaseModel):
    """Request-Schema fuer den Company-Enrichment-Endpoint.

    ``company_name`` ist Pflicht. Falls ``domain`` bereits bekannt ist,
    wird die Domain-Search uebersprungen und direkt das Company-Enrichment
    mit der angegebenen Domain ausgefuehrt.

    Attributes:
        company_name: Firmenname (Pflicht).
        domain: Optionale Firmen-Domain – ueberspringt Domain-Search wenn gesetzt.
        company_type: Art der Firma – nur bei Neuanlage gesetzt
            (``endcustomer`` | ``broker``).
    """

    company_name: str = Field(..., min_length=1, max_length=255)
    domain: str | None = Field(default=None, max_length=500)
    company_type: Literal["endcustomer", "broker"] | None = Field(default=None)


class EnrichRequest(BaseModel):
    """Request-Body fuer POST /crm/enrich – Kontaktdaten via Hunter.io anreichern.

    Nimmt Name + Company-Domain entgegen, legt eine Person an und
    triggert sofort den Hunter.io Email-Finder.

    Attributes:
        first_name: Vorname der Zielperson.
        last_name: Nachname der Zielperson.
        company_domain: Company-Domain fuer den Email-Finder (z.B. "example.com").
    """

    first_name: str = Field(min_length=1, max_length=255)
    last_name: str = Field(min_length=1, max_length=255)
    company_domain: str = Field(min_length=1, max_length=255)
