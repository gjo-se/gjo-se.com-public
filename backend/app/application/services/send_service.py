"""Application submission send service (gjo_se_com).

Sends a prepared, persisted submission reliably and records the outcome:

* contact-block check (person / canonical company) before sending,
* plain-text send of the *persisted* snapshot (``subject`` + ``body``)
  including the CV attachment, with ``reply_to``, ``from_override`` and
  ``save_to_sent_items``,
* on success: status ``sent`` + outbound communication log + project marker
  ``applied``,
* on failure: status ``failed`` (committed) and a propagated
  :class:`ApplicationSendError` – no communication log, no best-effort.

A ``failed`` submission can be retried via :func:`retry_submission` without
re-rendering text or CV – the persisted snapshot is reused verbatim.
"""

from __future__ import annotations

from datetime import UTC, datetime

import structlog

from app.application.exceptions import ApplicationSendError
from app.application.infrastructure import application_mail_client
from app.application.repositories import (
    communication_repository,
    document_repository,
)
from app.application.schemas.submission_schemas import SubmissionDetailOut
from app.shared.db_access.session_types import AsyncSession
from app.shared.notification.dependencies.notification_dependencies import get_notification_service
from app.shared.notification.infrastructure.graph_sendmail_client import GraphAttachment
from app.shared.notification.templates.renderer import RenderedEmail
from app.shared.ports.crm_contact import get_crm_contact_port
from app.shared.ports.project import ProjectCatalogPort
from app.shared.status.repositories import status_repository, statusable_repository
from app.shared.storage.infrastructure.factory_client import get_object_store

logger = structlog.get_logger(__name__)

_STATUSABLE_TYPE = "application_submission"
_STATUS_CATEGORY = "application"

#: Domains/suffixes that can never receive mail (RFC 2606 + reserved TLDs).
#: Guards against sending to a leftover placeholder recipient snapshot.
_RESERVED_RECIPIENT_DOMAINS = frozenset({"example.com", "example.org", "example.net", "example.edu"})
_RESERVED_RECIPIENT_SUFFIXES = (".invalid", ".test", ".localhost", ".example")


def _is_undeliverable_recipient(email: str) -> bool:
    """True when the recipient address uses a reserved, non-deliverable domain."""
    domain = email.rsplit("@", 1)[-1].strip().lower()
    if not domain:
        return True
    return domain in _RESERVED_RECIPIENT_DOMAINS or domain.endswith(_RESERVED_RECIPIENT_SUFFIXES)


async def _resolve_primary_person_id(db: AsyncSession, project_id: int) -> int | None:
    """Returns the ``crm_person_id`` of the project's primary contact, if any."""
    port = await get_crm_contact_port()
    primary = await port.list_primary_contacts(db, project_id)
    first = next(iter(primary), None)
    return first.person_id if first is not None else None


async def _resolve_cv_attachment(db: AsyncSession, submission: SubmissionDetailOut) -> GraphAttachment:
    """Reads the CV document from the object store as an in-memory attachment.

    Raises:
        ApplicationSendError: If the submission has no ``cv`` document.
    """
    documents = await document_repository.get_cv_by_submission(db, submission.id)
    document = next(iter(documents), None)
    if document is None:
        raise ApplicationSendError("CV-Dokument fehlt am Vorgang")

    data = await get_object_store().get(document.storage_key)
    return GraphAttachment(name=document.filename, content_type=document.mime_type, data=data)


async def _set_submission_status(db: AsyncSession, submission_id: int, status_name: str) -> None:
    """Assigns the named ``application`` status to a submission.

    Raises:
        ApplicationSendError: If no such status exists in ``core_status``.
    """
    status_obj = await status_repository.get_by_name_and_category(db, status_name, _STATUS_CATEGORY)
    if status_obj is None:
        raise ApplicationSendError(f"Status '{status_name}' (category=application) fehlt")
    await statusable_repository.set_status(db, _STATUSABLE_TYPE, submission_id, status_obj.id)


async def _add_outbound_communication(db: AsyncSession, submission: SubmissionDetailOut) -> None:
    """Logs a successful send as an outbound email communication."""
    _ = await communication_repository.create_outbound(
        db,
        submission.id,
        submission.subject,
        submission.body,
        date=datetime.now(UTC),
    )


async def send_submission(db: AsyncSession, submission: SubmissionDetailOut, catalog: ProjectCatalogPort) -> None:
    """Sends a persisted submission snapshot and records the outcome.

    The persisted ``subject``/``body`` plain-text snapshot is sent verbatim (no
    re-render) with the CV attachment, ``reply_to``, ``from_override`` and
    ``save_to_sent_items``. The contact block is checked before sending.

    Args:
        db: Active gjo_se_com DB session.
        submission: The persisted submission to send.
        catalog: Project-catalog port (fbf-owned project status write).

    Raises:
        ContactBlockedError: If the project's primary contact (or its canonical
            company) is contact-blocked – the submission is left untouched.
        ApplicationSendError: If the recipient is a non-deliverable placeholder,
            the CV is missing, or the send fails (status is then persisted as
            ``failed``).
    """
    if _is_undeliverable_recipient(submission.recipient_email):
        raise ApplicationSendError(
            "Empfänger-E-Mail ist ein Platzhalter (nicht zustellbar) – "
            "Kontaktdaten bitte korrigieren und Vorgang neu aufsetzen"
        )

    person_id = await _resolve_primary_person_id(db, submission.project_id)
    if person_id is not None:
        port = await get_crm_contact_port()
        await port.assert_person_not_blocked(db, person_id)
    else:
        logger.warning(
            "application_send: no primary contact for project %s – contact-block check skipped",
            submission.project_id,
        )

    attachment = await _resolve_cv_attachment(db, submission)
    rendered = RenderedEmail(
        subject=submission.subject,
        html=None,
        text=submission.body,
    )

    try:
        await get_notification_service().send_rendered_email(
            feature="application",
            rendered=rendered,
            recipient=submission.recipient_email,
            attachments=[attachment],
            from_override=submission.sender_email,
            from_name=application_mail_client.APPLICATION_SIGNATURE.name,
            reply_to=submission.reply_to_email,
            save_to_sent_items=True,
        )
        await _set_submission_status(db, submission.id, "sent")
        await _add_outbound_communication(db, submission)
        await catalog.set_status(db, submission.project_id, "applied")
        logger.info("application_send: submission %s sent", submission.id)
    except Exception as exc:
        logger.exception("application_send: send failed (submission=%s)", submission.id)
        await _set_submission_status(db, submission.id, "failed")
        await db.commit()
        raise ApplicationSendError(str(exc)) from exc


async def retry_submission(db: AsyncSession, submission: SubmissionDetailOut, catalog: ProjectCatalogPort) -> None:
    """Retries sending a ``failed`` submission from the persisted snapshot.

    Args:
        db: Active gjo_se_com DB session.
        submission: The submission to retry.
        catalog: Project-catalog port (fbf-owned project status write).

    Raises:
        ApplicationSendError: If the submission is not in status ``failed``.
        ContactBlockedError: If the contact is now contact-blocked.
    """
    current = await statusable_repository.get_status(db, _STATUSABLE_TYPE, submission.id)
    if current is None or current.status.name != "failed":
        raise ApplicationSendError("Retry nur für fehlgeschlagene Vorgänge")

    await send_submission(db, submission, catalog)
