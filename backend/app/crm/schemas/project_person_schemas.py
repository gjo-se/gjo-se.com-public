"""Pydantic-Schemas fuer Projekt-CRM-Person-Verknuepfungen (ProjectPerson)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProjectPersonCreate(BaseModel):
    """Request-Schema zum Verknuepfen eines Projekts mit einer CRM-Person.

    ``project_id`` und ``crm_person_id`` sind Pflicht – die FKs sind stabil.
    Die FK-Validierung (Projekt/Person existieren?) erfolgt im Service-Layer.

    Attributes:
        project_id: FK zum Projekt (Integer, Pflicht).
        crm_person_id: FK zur CRM-Person (Integer, Pflicht).
        label: Beziehungs-Label (z.B. ``primary``, ``secondary``).
    """

    project_id: int
    crm_person_id: int
    label: str = Field(default="primary", max_length=100)


class ProjectPersonOut(BaseModel):
    """Response-Schema fuer ProjectPerson – liefert alle Verknuepfungsdaten.

    ``model_config`` mit ``from_attributes=True`` ermoeglicht ``model_validate(orm_obj)``.

    Attributes:
        id: Primaerschluessel (Integer).
        project_id: FK zum Projekt.
        crm_person_id: FK zur CRM-Person.
        label: Beziehungs-Label (z.B. ``primary``, ``secondary``).
        created_at: Anlage-Zeitstempel (UTC).
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    crm_person_id: int
    label: str
    created_at: datetime
