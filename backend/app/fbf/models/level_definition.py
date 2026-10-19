"""SQLAlchemy-Modell fuer LevelDefinition (FBF-Domain, Level-Skala 0–5)."""

from sqlalchemy import SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db_access.base import Base


class LevelDefinition(Base):
    """Semantische Definition der Level-Skala (0–5) fuer Skills.

    Attributes:
        level: Primaerschluessel (0–5).
        label: Kurzbezeichnung (z.B. "Unbekannt").
        description: Ausfuehrliche Beschreibung der Stufe.
    """

    __tablename__ = "fbf_level_definition"

    level: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    label: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
