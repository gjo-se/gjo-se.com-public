"""Pydantic-Schemas fuer Project-Enrichment (Request + Response)."""

from typing import Any

from pydantic import BaseModel, Field

from app.crm.schemas.company_schemas import CompanyOut
from app.crm.schemas.person_schemas import PersonOut


class ProjectEnrichRequest(BaseModel):
    """Request-Schema fuer den Project-Enrichment-Orchestrierungs-Endpoint.

    Alle Felder sind optional. Ohne Body verhaelt sich der Endpoint wie
    bisher (find-or-create + Hunter.io). Mit gesetzten IDs werden die
    Entitaeten explizit vorgegeben – dann entfaellt das find-or-create
    fuer die jeweilige Entitaet.

    Attributes:
        crm_company_id: Optionale, bereits existierende Company-ID. Wenn
            gesetzt, wird genau diese Company verwendet (404 falls nicht
            gefunden) und ``enrich_company`` nicht aufgerufen.
        crm_person_id: Optionale, bereits existierende Person-ID. Wenn
            gesetzt, wird genau diese Person verwendet (404 falls nicht
            gefunden) – kein find-or-create, kein Enrichment.
        skip_hunter: Wenn ``True``, wird kein Hunter-Request ausgeloest
            (weder Domain-Search noch Company-/Person-Enrichment).
    """

    crm_company_id: int | None = Field(default=None)
    crm_person_id: int | None = Field(default=None)
    skip_hunter: bool = Field(default=False)


class ProjectEnrichResponse(BaseModel):
    """Response-Schema fuer den Project-Enrichment-Orchestrierungs-Endpoint.

    Attributes:
        company: Angereicherte Company.
        person: Angereicherte Person.
        project_crm_person_link_id: ID der Project-CRM-Person-Junction.
        enrichment_details: Details zu angereicherten Feldern.
    """

    company: CompanyOut
    person: PersonOut
    project_crm_person_link_id: int
    enrichment_details: dict[str, Any] | None = None
