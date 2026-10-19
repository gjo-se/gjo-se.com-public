"""SQLAlchemy-Modell fuer ImportanceDefinition (FBF-Domain, Importance-Skala 0–5)."""

from sqlalchemy import SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db_access.base import Base


class ImportanceDefinition(Base):
    """Semantische Definition der Importance-Skala (0–5) fuer Skills.

    Attributes:
        importance: Primaerschluessel (0–5).
        label: Kurzbezeichnung (z.B. "Unbewertet").
        description: Ausfuehrliche Beschreibung der Stufe.
    """

    __tablename__ = "fbf_importance_definition"

    importance: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    label: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
