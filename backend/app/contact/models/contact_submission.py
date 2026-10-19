"""SQLAlchemy model for contact form submissions (gjo_se_com)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db_access.base import Base


class ContactSubmission(Base):
    """A raw inbound contact form submission (SSOT for every request).

    Persisted before any mail/notification is sent (persist-first). Serves as
    admin fallback if SMTP/Notify fails. ``page`` is a hidden field tracking the
    page the request originated from; ``lang`` steers the autoresponder template.
    ``ip`` stores the client IP at request time (IPv4/IPv6) purely for internal
    pattern/block analysis – it is never exposed via the Admin API.

    Spam is persisted too, flagged via ``is_spam`` and ``spam_reason`` (one of
    ``honeypot`` / ``token`` / ``content``), so false positives stay observable
    and thresholds can be tuned later. Flagged rows never trigger mails and are
    purged after the retention window. Never edited, therefore intentionally
    without ``updated_at``.
    """

    __tablename__ = "contact_submission"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    page: Mapped[str | None] = mapped_column(String(200), nullable=True)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    lang: Mapped[str] = mapped_column(String(5), nullable=False, default="de")
    is_spam: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    spam_reason: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
