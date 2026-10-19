"""SQLAlchemy model for application experience projects (gjo_se_com).

Part of the ``application_experience`` sibling domain – the structured SSOT
for the project list (CV ``Experience`` block, admin overlay, later
freelancermap/XING). Every text block lives in its own field (Jinja-ready,
no markdown blob), localized via ``application_experience_translation``.
"""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base
from app.shared.db_access.timestamp_mixin import TimestampMixin

if TYPE_CHECKING:
    from app.application.models.experience_decision import (
        ExperienceDecision,
    )
    from app.application.models.experience_proof import (
        ExperienceProof,
    )
    from app.application.models.experience_translation import (
        ExperienceTranslation,
    )
    from app.application.models.profile import Profile


class Experience(TimestampMixin, Base):
    """One experience project block (structure).

    Linked 1:N to ``application_profile`` (ON DELETE CASCADE), 1:N to
    ``application_experience_translation`` (localized text blocks), 1:N to
    ``application_experience_decision`` (``Lösung WIE`` decisions) and 1:N to
    ``application_experience_proof`` (proof bullets). Sorted by ``sort``
    ascending. Status (active/inactive) via ``core_statusable``
    (type ``application_experience``).

    ``company`` is **internal-only** (source/agency tracking) and MUST NEVER be
    rendered in the CV, public API or freelancermap exports.
    """

    __tablename__ = "application_experience"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_profile_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("application_profile.id", ondelete="CASCADE"),
        nullable=False,
    )
    position: Mapped[str] = mapped_column(String(255), nullable=False)
    #: Internal-only source/agency field – NEVER rendered (CV/public/freelancermap).
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    project_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    sort: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    application_profile: Mapped[Profile] = relationship("Profile")
    translations: Mapped[list[ExperienceTranslation]] = relationship(
        "ExperienceTranslation",
        back_populates="experience",
        cascade="all, delete-orphan",
    )
    decisions: Mapped[list[ExperienceDecision]] = relationship(
        "ExperienceDecision",
        back_populates="experience",
        cascade="all, delete-orphan",
        order_by="ExperienceDecision.sort",
    )
    proofs: Mapped[list[ExperienceProof]] = relationship(
        "ExperienceProof",
        back_populates="experience",
        cascade="all, delete-orphan",
        order_by="ExperienceProof.sort",
    )
