"""PII-retention maintenance for contact form submissions.

Flagged spam rows are purged after ``SPAM_RETENTION_DAYS``; the purge runs as a
scheduled maintenance job. Legitimate submissions are never touched.
"""

from datetime import UTC, datetime, timedelta

import structlog

from app.contact.repositories import contact_submission_repository
from app.shared.db_access.session_types import AsyncSession

logger = structlog.get_logger(__name__)

#: Days after which unreviewed spam rows are purged (PII retention).
SPAM_RETENTION_DAYS = 30


async def purge_spam_older_than(db: AsyncSession, *, days: int = SPAM_RETENTION_DAYS) -> int:
    """Delete spam submissions older than the retention window (PII retention).

    Only flagged rows are removed – legitimate submissions are kept. Runs as a
    scheduled maintenance job.

    Args:
        db: Active DB session.
        days: Retention window in days; spam rows older than this are deleted.

    Returns:
        Number of deleted rows.
    """
    cutoff = datetime.now(UTC) - timedelta(days=days)
    deleted = await contact_submission_repository.purge_spam_before(db, cutoff=cutoff)
    logger.info("contact: purged spam submissions", deleted=deleted, days=days)
    return deleted
