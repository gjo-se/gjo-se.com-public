"""Status und Statusable – projektweit einheitliche Status-Definition (SSOT)."""

from datetime import UTC, datetime

from sqlalchemy import (
    ARRAY,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base


class Status(Base):
    """Projektweit einheitliche Status-Definition (SSOT)."""

    __tablename__ = "shared_status"
    __table_args__ = (UniqueConstraint("name", "category", name="uq_shared_status_name_category"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    category: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    color_token: Mapped[str] = mapped_column(String(30), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sort_order: Mapped[float] = mapped_column(Float, default=0.0)
    scope: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    statusable_entries: Mapped[list["Statusable"]] = relationship("Statusable", back_populates="status")


class Statusable(Base):
    """Polymorphe Junction: verknuepft Status mit beliebigen Entitaeten (singular)."""

    __tablename__ = "shared_statusable"
    __table_args__ = (
        UniqueConstraint(
            "statusable_type",
            "statusable_id",
            name="uq_shared_statusable_type_id",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    status_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("shared_status.id", ondelete="RESTRICT"),
        nullable=False,
    )
    statusable_type: Mapped[str] = mapped_column(String(50), nullable=False)
    statusable_id: Mapped[int] = mapped_column(Integer, nullable=False)

    status: Mapped["Status"] = relationship("Status", back_populates="statusable_entries")
