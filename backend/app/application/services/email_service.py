"""Application email service – sends via the notification facade.

The One-Click Workflow (Finding 5) calls ``send_application_email`` with a
ready-rendered context. Rendering (MJML + Jinja2) and SMTP transport are
handled centrally by ``get_notification_service().send_email`` using the registered
``("application", "application")`` template – including PDF attachments,
BCC copy to the profile sender and the profile sender as from-override.
"""

import structlog

from app.shared.notification.dependencies.notification_dependencies import get_notification_service

logger = structlog.get_logger(__name__)


async def send_application_email(
    *,
    recipient: str,
    context: dict[str, object],
    from_override: str | None = None,
    bcc: list[str] | None = None,
    pdf_paths: list[str] | None = None,
) -> dict[str, str]:
    """Send an application email through the notification facade.

    Args:
        recipient: Recipient email address (e.g. CRM person).
        context: Ready-rendered Jinja2 context (built by the data-driven
            mail builder).
        from_override: Optional sender address (profile email).
        bcc: Optional BCC recipient addresses.
        pdf_paths: Optional list of absolute file paths to PDF attachments.

    Returns:
        ``{"status": "sent"}`` on success.
    """
    await get_notification_service().send_email(
        feature="application",
        template="application",
        context=context,
        recipient=recipient,
        attachments=list(pdf_paths) if pdf_paths else None,
        from_override=from_override,
        bcc=bcc,
    )
    logger.info(
        "Application email sent to %s (subject: %s, attachments: %d)",
        recipient,
        context.get("subject", ""),
        len(pdf_paths) if pdf_paths else 0,
    )

    return {"status": "sent"}
