"""Data-driven application mail builder (gjo_se_com).

Builds the application mail subject and plain-text "Türöffner" body exclusively
from the single-row application profile and the target project. No LLM is
involved – the content is reproducible and free of hallucination.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import TYPE_CHECKING
from urllib.parse import urlparse

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.repositories import profile_repository
from app.shared.notification.templates.notification_template_registry import (
    NotificationTemplateRegistry,
)
from app.shared.notification.templates.renderer import RenderedEmail, render_email
from app.shared.ports.project import ProjectCatalogPort, ProjectRef

if TYPE_CHECKING:
    from app.application.models.submission import (
        Submission,
    )

logger = structlog.get_logger(__name__)


@dataclass(frozen=True)
class ApplicationSignature:
    """Private sign-off for the application mail.

    Deliberately **separate** from the core ``EMAIL_SIGNATURE`` (§ 35a GmbHG):
    the application mail is a personal freelance approach, not a business
    letter, so it carries only the private contact details.

    Attributes:
        name: Full name.
        role: Professional role (headline).
        phone_display: Phone number in display form.
        email: Contact e-mail address.
        website_display: Website in display form (without scheme).
    """

    name: str = "Gregory Jo Erdmann"
    role: str = "Senior AI Architect | Engineer"
    phone_display: str = "+49 152 26599108"
    email: str = "gjo@gjo-se.com"
    website_display: str = "gjo-se.com"


#: Single source of truth for the private application-mail signature.
APPLICATION_SIGNATURE = ApplicationSignature()

#: Mail languages supported by the application mail.
SUPPORTED_LANGUAGES: tuple[str, ...] = ("de", "en")
#: Language used when the caller does not pass one.
DEFAULT_LANGUAGE = "de"

#: German generic salutation used when the recipient has no real person name.
GENERIC_GREETING = "Guten Tag,"
#: English generic salutation used when the recipient has no real person name.
GENERIC_GREETING_EN = "Dear Sir or Madam,"
#: Generic salutations per language.
_GENERIC_GREETINGS: dict[str, str] = {
    "de": GENERIC_GREETING,
    "en": GENERIC_GREETING_EN,
}
#: Personal salutation templates per language (``{name}`` placeholder).
_GREETING_TEMPLATES: dict[str, str] = {
    "de": "Guten Tag, {name},",
    "en": "Dear {name},",
}
#: Subject prefixes per language.
_SUBJECT_PREFIXES: dict[str, str] = {
    "de": "Bewerbung",
    "en": "Application",
}
#: Placeholder names treated as "no person name known" (case-insensitive).
_UNKNOWN_NAME_TOKENS = frozenset({"unbekannt", "unknown"})

#: Gender marker (m/w/d and variants) or the gender-neutral "gn".
_GENDER_TOKEN = r"(?:[mwdgnf]\s*/\s*[mwdgnf]\s*/\s*[mwdgnf]|gn)"
#: Remote marker "100 % remote".
_REMOTE_TOKEN = r"100\s*%\s*remote"
#: Noise tokens including optional surrounding brackets/hyphens/whitespace.
_SUBJECT_NOISE_RE = re.compile(
    rf"(?:\s*[\(\[\|/\-–]\s*)?(?:{_GENDER_TOKEN}|{_REMOTE_TOKEN})(?:\s*[\)\]\|/\-–]\s*)?",
    re.IGNORECASE,
)
_WHITESPACE_RE = re.compile(r"\s+")
#: Characters trimmed from both subject ends after noise removal.
_SUBJECT_TRIM_CHARS = " \t·•|/-,;:–—"


def normalize_title(title: str) -> str:
    """Normalizes a project title into a clean role/subject line.

    Removes gender markers (``(m/w/d)`` and variants) and ``100 % remote``
    including their surrounding brackets/hyphens, then trims separators and
    whitespace. Purely string-based – no LLM. Used both as the default mail
    subject and as the fallback when ``project.title_normalized`` is empty.

    Args:
        title: Raw project title.

    Returns:
        The normalized title.
    """
    cleaned = _SUBJECT_NOISE_RE.sub(" ", title)
    cleaned = _WHITESPACE_RE.sub(" ", cleaned)
    return cleaned.strip(_SUBJECT_TRIM_CHARS)


def build_greeting(
    recipient_name: str | None,
    company_name: str | None = None,
    language: str = DEFAULT_LANGUAGE,
) -> str:
    """Builds the mail salutation from the recipient name and language.

    Falls back to a generic salutation when no real person is known: the name
    is empty, a known placeholder (e.g. ``unbekannt``), or identical to the
    company name (e.g. a leftover company name in the contact field).

    Args:
        recipient_name: Recipient person name (first + last), may be empty.
        company_name: Optional canonical company name for the equality guard.
        language: Mail language (``de``/``en``); defaults to German.

    Returns:
        The personalized salutation, or the language's generic salutation
        (``"Guten Tag,"`` / ``"Dear Sir or Madam,"``).
    """
    name = (recipient_name or "").strip()
    if not name or name.casefold() in _UNKNOWN_NAME_TOKENS:
        return _GENERIC_GREETINGS[language]
    company = (company_name or "").strip()
    if company and name.casefold() == company.casefold():
        return _GENERIC_GREETINGS[language]
    return _GREETING_TEMPLATES[language].format(name=name)


def _source_label(url: str) -> str:
    """Returns the portal name from a project URL host (e.g. ``freelancermap``).

    ``www.`` is stripped and the registrable second-level label is used, so
    ``https://www.freelancermap.de/projekt/x`` yields ``freelancermap``. Returns
    an empty string when the URL has no host.
    """
    host = urlparse(url).netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    return host.split(".")[0] if host else ""


def resolve_title_normalized(project: ProjectRef) -> str:
    """Returns the curated application title (``title_normalized``) or a fallback.

    Single source of truth for the role line: the mail subject/opener *and* the
    role segment of the CV file name derive from this exact value, so subject,
    body and attachment label always agree by construction.
    """
    curated = project.title_normalized.strip() if project.title_normalized else ""
    return curated or normalize_title(project.title)


async def _resolve_external_id(db: AsyncSession, project: ProjectRef, catalog: ProjectCatalogPort) -> str | None:
    """Resolves the public freelancermap project id via the shared URL.

    There is no foreign key between ``project`` and ``project_freelancer_map`` –
    the raw record is matched solely by the shared ``url``. Returns ``None``
    (and logs a warning) when no mapping exists; no value is invented.
    """
    external_id = await catalog.get_freelancermap_external_id(db, project.url)
    if external_id is None:
        logger.warning(
            "application_mail: no freelancermap mapping for project %s (url=%s)",
            project.id,
            project.url,
        )
        return None
    return external_id


def build_mail_subject(
    external_id: str | None,
    title_normalized: str,
    sender_name: str,
    language: str = DEFAULT_LANGUAGE,
) -> str:
    """Builds the mail subject: the assignment anchor for the ATS/CRM.

    With a resolved ``external_id`` the id segment is included; without a
    mapping the subject stays fully sendable and simply omits that segment.
    Segments are separated by an EN DASH (U+2013). The prefix follows the mail
    language (``Bewerbung`` / ``Application``).

    Args:
        external_id: Public freelancermap project id, or ``None``.
        title_normalized: Curated application title (the role segment).
        sender_name: Sender's full name.
        language: Mail language (``de``/``en``); defaults to German.

    Returns:
        The subject line.
    """
    prefix = _SUBJECT_PREFIXES[language]
    if external_id:
        return f"{prefix} – {external_id} – {title_normalized} – {sender_name}"
    return f"{prefix} – {title_normalized} – {sender_name}"


async def build_application_mail_context(
    db: AsyncSession,
    *,
    catalog: ProjectCatalogPort,
    project_id: int,
    recipient_name: str,
    company_name: str | None = None,
    language: str = DEFAULT_LANGUAGE,
) -> dict[str, object]:
    """Builds the Jinja2 context for the application mail from backend data.

    Args:
        db: Active gjo_se_com DB session.
        catalog: Project-catalog port (fbf-owned project facts).
        project_id: Target project id.
        recipient_name: Recipient person name for the greeting.
        company_name: Optional canonical company name – when it equals the
            recipient name, the generic salutation is used.
        language: Mail language (``de``/``en``); defaults to German.

    Returns:
        Context dict consumed by the ``("application", "application_<lang>")``
        template.

    Raises:
        ValueError: If the project or the application profile does not exist.
    """
    try:
        project = await catalog.get_project(db, project_id)
        if project is None:
            logger.warning("application_mail: project %s not found", project_id)
            raise ValueError(f"Project {project_id} not found")

        profile = await profile_repository.get_profile(db)
        if profile is None:
            logger.warning("application_mail: application profile not found")
            raise ValueError("Application profile not found")

        title_normalized = resolve_title_normalized(project)
        external_id = await _resolve_external_id(db, project, catalog)
        sender_name = profile.full_name
        return {
            "subject": build_mail_subject(external_id, title_normalized, sender_name, language=language),
            "greeting": build_greeting(recipient_name, company_name, language=language),
            "source_label": _source_label(project.url),
            "title_normalized": title_normalized,
            "external_id": external_id,
            "sender_name": sender_name,
            "signature": APPLICATION_SIGNATURE,
            "profile_email": profile.email,
            "language": language,
        }
    except ValueError:
        raise
    except Exception:
        logger.exception("application_mail: context build failed (project_id=%s)", project_id)
        raise


async def render_application_mail(
    db: AsyncSession,
    *,
    catalog: ProjectCatalogPort,
    project_id: int,
    recipient_name: str,
    company_name: str | None = None,
    language: str = DEFAULT_LANGUAGE,
) -> RenderedEmail:
    """Renders the application mail (subject + plain text) from backend data.

    Args:
        db: Active gjo_se_com DB session.
        catalog: Project-catalog port (fbf-owned project facts).
        project_id: Target project id.
        recipient_name: Recipient person name for the greeting.
        company_name: Optional canonical company name for the greeting guard.
        language: Mail language (``de``/``en``); defaults to German.

    Returns:
        The rendered email parts.

    Raises:
        ValueError: If the project or the application profile does not exist,
            or the requested language is not supported.
    """
    if language not in SUPPORTED_LANGUAGES:
        raise ValueError(f"Unsupported language: {language!r}")
    context = await build_application_mail_context(
        db,
        catalog=catalog,
        project_id=project_id,
        recipient_name=recipient_name,
        company_name=company_name,
        language=language,
    )
    template = NotificationTemplateRegistry().get("application", f"application_{language}")
    return render_email(template, context)


def store_mail_on_submission(
    submission: Submission,
    rendered: RenderedEmail,
) -> None:
    """Stores the rendered mail on a submission in-memory.

    The caller is responsible for flushing/persisting the submission.

    Args:
        submission: Submission to update.
        rendered: Rendered email whose subject and plain text are stored.
    """
    submission.subject = rendered.subject
    submission.body = rendered.text
