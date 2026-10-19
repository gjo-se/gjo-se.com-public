"""SQLAlchemy-Modell fuer SkillGroup (FBF-Domain, kuratierte Skill-Gruppen-Master)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base

if TYPE_CHECKING:
    from app.fbf.models.skill_group_translation import (
        SkillGroupTranslation,
    )


class SkillGroup(Base):
    """Kuratierte Skill-Gruppe (Master-Daten) der FBF-Domain.

    Haelt pro Gruppe die Reihenfolge (``sort``, ersetzt kuenftig den
    hartcodierten ``SKILL_GROUP_ORDER`` im FE) und die Prioritaet (``priority``,
    ``high``/``medium``/``base`` – steuert die Karten-Hierarchie auf der
    Skills-Seite) sowie lokalisierte Gruppennamen ueber die 1:N-``translations``-Relationship.

    Die Identitaet ist die ``id`` – ein Slug/Label existiert bewusst nicht
    (Name kommt aus den Translationen). Die Insert-Reihenfolge des Seeds legt
    die ``id`` 1..10 deterministisch fest (languages=1 … method=10), damit
    Ticket A2 die bestehenden ``fbf_skill.group``-Enum-Strings auf die
    spaetere ``group_id``-FK mappen kann.
    """

    __tablename__ = "fbf_skill_group"
    __table_args__ = (
        CheckConstraint(
            "priority IN ('high', 'medium', 'base')",
            name="ck_fbf_skill_group_priority",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sort: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")

    translations: Mapped[list[SkillGroupTranslation]] = relationship(
        "SkillGroupTranslation",
        back_populates="skill_group",
        cascade="all, delete-orphan",
        order_by="SkillGroupTranslation.id",
    )
