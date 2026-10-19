"""Pydantic schema for the output of a ProjectFreelancerMap entry."""

import json
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProjectFreelancerMapOut(BaseModel):
    """Output schema for a scraped freelancermap.de project.

    Attributes:
        id: Primary key.
        external_id: Portal-assigned project ID.
        url: Full project URL.
        title: Project title.
        description: Project description as Markdown.
        agency: Client/agency.
        contact_name: Contact person.
        city: Location city.
        country: Location country.
        remote_percent: Remote share in percent.
        contract_type: Contract type.
        duration: Project duration in months.
        start_date: Start date as text.
        skills: List of skill names.
        industry: Industry label in German.
        extension_possible: Extension option.
        endcustomer: Direct award from end client.
        search_term_id: FK to the SearchTerm through which the project was found.
        search_term_name: Resolved name of the SearchTerm (computed from relationship).
        posted_at: Posting date on the portal (with timezone).
        scraped_at: Timestamp of the scraping run.
        mapped_at: Timestamp of successful normalisation.
            None = not yet mapped.
    """

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    external_id: str
    url: str
    title: str
    description: str | None
    agency: str | None
    contact_name: str | None
    city: str | None
    country: str | None
    remote_percent: int | None
    contract_type: str | None
    duration: int | None
    start_date: str | None
    skills: list[str] | None
    industry: str | None
    extension_possible: bool | None
    endcustomer: bool | None
    search_term_id: int | None
    search_term_name: str | None = Field(default=None, validation_alias="search_term")
    posted_at: datetime
    scraped_at: datetime
    mapped_at: datetime | None

    @field_validator("search_term_name", mode="before")
    @classmethod
    def _extract_search_term_name(cls, value: object) -> str | None:
        """Resolves the SearchTerm name from the ``search_term`` ORM relationship.

        Args:
            value: SearchTerm ORM object, string or None.

        Returns:
            Search term name or None.
        """
        if value is None:
            return None
        if isinstance(value, str):
            return value
        return getattr(value, "name", None)

    @field_validator("skills", mode="before")
    @classmethod
    def parse_skills(cls, v: object) -> list[str] | None:
        """Parses the JSON string from the DB into a Python list.

        Args:
            v: Raw value from the DB (JSON string, list or None).

        Returns:
            List of skill names or None.
        """
        if v is None:
            return None
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            try:
                result = json.loads(v)
                return result if isinstance(result, list) else None
            except (json.JSONDecodeError, ValueError):
                return None
        return None
