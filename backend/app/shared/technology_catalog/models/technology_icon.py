"""SQLAlchemy model for shared_technology_icon – icon metadata and download tracking."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base

if TYPE_CHECKING:
    from app.shared.technology_catalog.models.technology import Technology


class TechnologyIcon(Base):
    """Icon metadata for a technology entry.

    Each Technology can have multiple icon variants (dark/light). Tracks
    download status and file metadata for both PNG and SVG formats.
    """

    __tablename__ = "shared_technology_icon"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    core_technology_catalog_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("shared_technology.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    variant: Mapped[str] = mapped_column(String, nullable=False)
    icon_external_id: Mapped[str] = mapped_column(String, nullable=False)
    storage_key: Mapped[str | None] = mapped_column(String, nullable=True)
    downloaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    content_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    svg_storage_key: Mapped[str | None] = mapped_column(String, nullable=True)
    svg_downloaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    svg_file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_error: Mapped[str | None] = mapped_column(String, nullable=True)
    last_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    technology: Mapped["Technology"] = relationship("Technology", back_populates="icons", lazy="noload")
