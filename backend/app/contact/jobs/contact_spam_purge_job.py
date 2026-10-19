"""Scheduled job: purge spam contact submissions past the PII retention window."""

from __future__ import annotations


async def purge_contact_spam() -> None:
    """Purge contact submissions flagged as spam past the PII retention window."""
    from app.contact.services.contact_retention_service import (
        purge_spam_older_than,
    )
    from app.shared.db_access.session import AsyncSessionLocal as GjoAsyncSessionLocal

    async with GjoAsyncSessionLocal() as gjo_db:
        _ = await purge_spam_older_than(gjo_db)
