"""Pydantic-Schemas fuer ProjectEndcustomerCandidate."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.fbf.models.project_endcustomer_candidate import (
    EndcustomerCandidateSource,
)


class ProjectEndcustomerCandidateOut(BaseModel):
    """Output-Schema fuer einen Endkunden-Kandidaten.

    ``from_attributes=True`` erlaubt ``model_validate(orm_obj)``.
    Status wird via ``core_statusable``-JOIN aus der DB gelesen.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    company_name: str
    website: str | None = None
    career_page_url: str | None = None
    confidence: float | None = None
    source: EndcustomerCandidateSource
    career_page_description: str | None = None
    similarity_to_project: float | None = None
    reasoning: str | None = None
    status: str | None = None
    status_color_token: str | None = None
    created_at: datetime


class ProjectEndcustomerCandidateCreate(BaseModel):
    """Input-Schema zur Anlage eines Endkunden-Kandidaten.

    ``status`` wird vom Service/Repository auf ``pending`` gesetzt.
    """

    project_id: int
    company_name: str
    website: str | None = None
    career_page_url: str | None = None
    confidence: float | None = None
    source: EndcustomerCandidateSource
    career_page_description: str | None = None
    similarity_to_project: float | None = None
    reasoning: str | None = None
