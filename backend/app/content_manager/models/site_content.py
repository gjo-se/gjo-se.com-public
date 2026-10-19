"""SQLAlchemy model for content_manager_site_content – bilingual key-value storage."""

from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db_access.base import Base


class SiteContent(Base):
    """Bilingual key-value content store.

    Composite primary key (key, language) allows one key to have multiple
    language variants (currently DE/EN). The value column is nullable to
    allow keys that only exist in one language.
    """

    __tablename__ = "content_manager_site_content"

    key: Mapped[str] = mapped_column(String(255), primary_key=True, nullable=False)
    language: Mapped[str] = mapped_column(String(10), primary_key=True, nullable=False)
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
