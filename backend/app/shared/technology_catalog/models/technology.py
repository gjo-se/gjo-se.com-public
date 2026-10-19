"""SQLAlchemy model for shared_technology – canonical technology reference."""

from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, JSON, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base
from app.shared.db_access.timestamp_mixin import TimestampMixin

if TYPE_CHECKING:
    from app.shared.technology_catalog.models.technology_icon import TechnologyIcon


class Technology(TimestampMixin, Base):
    """Canonical technology entry for the external technology catalog.

    Serves as SSOT for Skills (FBF) and Viscera diagrams. Status is managed
    externally via shared_statusable (polymorphic junction table).
    """

    __tablename__ = "shared_technology"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    slugs: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    name_short: Mapped[str | None] = mapped_column(String(50), nullable=True)
    provider: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    type: Mapped[str | None] = mapped_column(String, nullable=True)
    color_token: Mapped[str] = mapped_column(String, nullable=False)
    viscera_restrictions: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    website_url: Mapped[str | None] = mapped_column(String, nullable=True)
    docs_url: Mapped[str | None] = mapped_column(String, nullable=True)
    external_id: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    vector: Mapped[list[float] | None] = mapped_column(ARRAY(Float), nullable=True)

    icons: Mapped[list["TechnologyIcon"]] = relationship("TechnologyIcon", back_populates="technology", lazy="noload")
