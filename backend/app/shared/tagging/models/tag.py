"""Tag und Taggable – projektweit einheitliche Tag-Definition (SSOT)."""

from datetime import UTC, datetime

from sqlalchemy import (
    ARRAY,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base


class Tag(Base):
    """Projektweit einheitliche Tag-Definition (SSOT)."""

    __tablename__ = "shared_tag"
    __table_args__ = (UniqueConstraint("name", "category", name="uq_shared_tag_name_category"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    color_token: Mapped[str] = mapped_column(String(30), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    scope: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    taggable_entries: Mapped[list["Taggable"]] = relationship(
        "Taggable", back_populates="tag", cascade="all, delete-orphan"
    )


class Taggable(Base):
    """Polymorphe Junction: verknuepft Tags mit beliebigen Entitaeten."""

    __tablename__ = "shared_taggable"
    __table_args__ = (Index("ix_shared_taggable_type_id", "taggable_type", "taggable_id"),)

    tag_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("shared_tag.id", ondelete="CASCADE"),
        primary_key=True,
    )
    taggable_type: Mapped[str] = mapped_column(String(50), primary_key=True)
    taggable_id: Mapped[int] = mapped_column(Integer, primary_key=True)

    tag: Mapped["Tag"] = relationship("Tag", back_populates="taggable_entries")
