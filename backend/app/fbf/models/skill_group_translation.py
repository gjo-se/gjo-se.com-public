"""SQLAlchemy-Modell fuer SkillGroupTranslation (lokalisierte Gruppennamen)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base

if TYPE_CHECKING:
    from app.fbf.models.skill_group import SkillGroup


class SkillGroupTranslation(Base):
    """Lokalisierter Gruppenname einer Skill-Gruppe.

    Linked 1:N zu ``fbf_skill_group`` (ON DELETE CASCADE). Hoechstens eine
    Zeile pro ``(skill_group_id, locale)``-Paar.
    """

    __tablename__ = "fbf_skill_group_translation"
    __table_args__ = (
        UniqueConstraint(
            "skill_group_id",
            "locale",
            name="uq_fbf_skill_group_translation_group_locale",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    skill_group_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("fbf_skill_group.id", ondelete="CASCADE"),
        nullable=False,
    )
    locale: Mapped[str] = mapped_column(String(10), nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)

    skill_group: Mapped[SkillGroup] = relationship("SkillGroup", back_populates="translations")
