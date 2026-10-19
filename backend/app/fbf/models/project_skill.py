"""SQLAlchemy-Modell fuer ProjectSkill Junction (AIScope-Domain)."""

from sqlalchemy import ForeignKey, Integer, PrimaryKeyConstraint, SmallInteger
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db_access.base import Base


class ProjectSkill(Base):
    """Verbindungstabelle n:m zwischen Project (Master) und Skill.

    Repraesentiert eine Skill-Nennung eines Master-Projekts. Ohne eigenen
    Zeitstempel: die Zeitachse ist ``project.posted_at``.

    Attributes:
        project_id: FK zu Project.id (Master).
        skill_id: FK zu fbf_skill.id.
        importance: Projekt-spezifische LLM-Importance (0–5, nullable).
            5 = Must-Have, 4 = Technologien, 3 = Nice-to-Have,
            2 = Aufgaben/Fließtext, 1 = nur erwähnt. NULL = keine Daten.
    """

    __tablename__ = "fbf_project_skill"
    __table_args__ = (PrimaryKeyConstraint("project_id", "skill_id", name="pk_fbf_project_skill"),)

    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("fbf_project.id"), nullable=False)
    skill_id: Mapped[int] = mapped_column(Integer, ForeignKey("fbf_skill.id"), nullable=False)
    importance: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
