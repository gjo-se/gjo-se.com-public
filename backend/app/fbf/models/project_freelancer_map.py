"""SQLAlchemy model for ProjectFreelancerMap (AIScope domain)."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.fbf.models.search_term import SearchTerm
from app.shared.db_access.base import Base


class ProjectFreelancerMap(Base):
    """Raw data table for scraped projects from freelancermap.de.

    Preserves the original field structure of the portal unchanged.
    No mapping – that follows in a separate normalisation step.

    Attributes:
        id: Primary key.
        external_id: Portal-assigned project ID (from JSON: ``project.id``).
        url: Full project URL – dedup key type 1.
        title: Project title.
        description: Project description as Markdown (converted from HTML).
        agency: Client/agency (from JSON: ``project.company``).
        contact_name: Contact person (from JSON: firstName + lastName).
        city: Location city (``project.city``, trimmed).
        country: Location country.
        remote_percent: Remote share in percent (0–100).
        contract_type: Contract type (e.g. ``contracting``).
        duration: Project duration in months (integer, can be None).
        start_date: Start date as text (e.g. ``5/2026``).
        skills: JSON array of skill names (e.g. ``["Python", "FastAPI"]``).
        industry: Industry label in German (``project.industry.nameDe``).
        extension_possible: Extension option (``project.verlaengerung == 1``).
        endcustomer: Whether the project was posted directly by the end client.
        search_term_id: FK to the SearchTerm through which the project was found.
        search_term: Relationship to the SearchTerm.
        posted_at: ISO-8601 datetime of the posting date on the portal.
        scraped_at: Timestamp of the scraping run (UTC).
        mapped_at: Timestamp of successful normalisation into the Project table.
            None = not yet mapped (processed in the next mapper run).
    """

    __tablename__ = "fbf_project_freelancer_map"

    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    url: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    agency: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(Text, nullable=True)
    country: Mapped[str | None] = mapped_column(Text, nullable=True)
    remote_percent: Mapped[int | None] = mapped_column(Integer, nullable=True)
    contract_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration: Mapped[int | None] = mapped_column(Integer, nullable=True)
    start_date: Mapped[str | None] = mapped_column(Text, nullable=True)
    skills: Mapped[str | None] = mapped_column(Text, nullable=True)
    industry: Mapped[str | None] = mapped_column(Text, nullable=True)
    extension_possible: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    endcustomer: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    search_term_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("fbf_search_term.id"), nullable=True, index=True
    )
    posted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    scraped_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    mapped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)

    search_term: Mapped[SearchTerm | None] = relationship("SearchTerm", lazy="selectin")
