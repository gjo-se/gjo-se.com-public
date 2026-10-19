"""SQLAlchemy-Modell fuer SearchTerm (FBF-Domain, Scraper-Suchbegriff)."""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db_access.base import Base


class SearchTerm(Base):
    """Repraesentiert einen Scraper-Suchbegriff fuer FBF-Scraping-Laeufe.

    Frueher ``job_role`` – dient ausschliesslich dem Scraper: der Scraper
    iteriert alle aktiven Suchbegriffe und paginiert das Portal.

    Status (active/inactive) wird via core_statusable (fbf_search_term) verwaltet.

    Attributes:
        id: Primaerschluessel.
        name: Eindeutiger Suchbegriff (z. B. "AI Engineer").
    """

    __tablename__ = "fbf_search_term"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
