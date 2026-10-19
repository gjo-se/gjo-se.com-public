"""SQLAlchemy-Modell fuer JobRole (FBF-Domain, analytische Job-Rolle)."""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db_access.base import Base


class JobRole(Base):
    """Kuratierte analytische Job-Rolle der FBF-Domain.

    Unabhaengig vom Scraper-Suchbegriff (``SearchTerm``): beschreibt die
    inhaltliche Rolle eines Projekts (z. B. "AI Engineer"), die per
    LLM-Klassifikation abgeleitet und von Greg bestaetigt wird.

    Der Kuratierungsstatus wird nicht mehr als Spalte am Modell gefuehrt,
    sondern via ``core_statusable`` (polymorphe Junction-Table) abgebildet.

    Attributes:
        id: Primaerschluessel.
        name: Rollen-Name – global eindeutig.
    """

    __tablename__ = "fbf_job_role"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
