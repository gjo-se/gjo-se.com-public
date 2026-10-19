"""Pure mapping of the freelancermap.de AJAX payload into persistence fields.

The scraper receives raw project dicts from the freelancermap.de AJAX endpoint.
This module owns the translation of such a dict into the field values persisted
through ``project_freelancer_map_repository`` so that the scraping service stays
a thin orchestrator (fetch → dedup → delta → persist) and does not carry the
portal-specific payload knowledge itself.
"""

import json
from dataclasses import dataclass
from datetime import datetime
from typing import Any

import structlog
from markdownify import markdownify

from app.fbf.constants import BASE_URL

logger = structlog.get_logger(__name__)


@dataclass(frozen=True)
class FreelancermapProjectFields:
    """Field values mapped from one freelancermap.de AJAX project payload."""

    external_id: str
    url: str
    title: str
    description: str | None
    agency: str | None
    contact_name: str | None
    city: str | None
    country: str | None
    remote_percent: int | None
    contract_type: str | None
    duration: int | None
    start_date: str | None
    skills_json: str | None
    industry: str | None
    extension_possible: bool | None
    endcustomer: bool | None


def map_project_identity(project: dict[str, Any]) -> tuple[str, str] | None:
    """Return ``(external_id, url)`` of a raw project, or ``None`` when unusable.

    The identity is resolved first because it is the dedup key: the URL is taken
    from ``links.project`` (relative) and falls back to the ``slug``. A missing
    id or URL is logged and yields ``None`` (the caller skips the record).

    Args:
        project: Raw project dict from the AJAX endpoint.

    Returns:
        A ``(external_id, url)`` tuple, or ``None`` when id or URL is missing.
    """
    external_id_raw = project.get("id")
    if not external_id_raw:
        logger.warning("Project without id -- skipping")
        return None
    external_id = str(external_id_raw)

    links = project.get("links")
    href: str | None = None
    if isinstance(links, dict):
        href = links.get("project")
    if not href:
        slug = project.get("slug")
        href = f"/projekt/{slug}" if slug else None
    if not href:
        logger.warning("No URL for project %s -- skipping", external_id)
        return None
    return external_id, BASE_URL + href


def map_project_details(
    project: dict[str, Any],
    external_id: str,
    url: str,
) -> FreelancermapProjectFields | None:
    """Return the mapped field values of a raw project, or ``None`` without a title.

    Translates every persisted field of the AJAX payload (description HTML → Markdown,
    contact/location, contract, duration, start date, skills, industry and the
    extension/direct-award flags). A missing title is logged and yields ``None``.

    Args:
        project: Raw project dict from the AJAX endpoint.
        external_id: Already resolved portal project id.
        url: Already resolved full project URL.

    Returns:
        The mapped :class:`FreelancermapProjectFields`, or ``None`` when the
        project carries no title.
    """
    title: str = project.get("title") or ""
    if not title:
        logger.warning("No title for project %s -- skipping", external_id)
        return None

    description_html: str | None = project.get("description")
    description: str | None = (
        markdownify(description_html, strip=["script", "style"]).strip() if description_html else None
    )

    first: str = project.get("firstName") or ""
    last: str = project.get("lastName") or ""
    contact_name: str | None = f"{first} {last}".strip() or None

    contract_obj = project.get("projectContractType")
    remote_percent: int | None = None
    contract_type: str | None = None
    if isinstance(contract_obj, dict):
        remote_percent = contract_obj.get("remoteInPercent")
        contract_type = contract_obj.get("type")

    duration_raw = project.get("duration")
    duration: int | None = int(duration_raw) if isinstance(duration_raw, int) else None

    start_month = project.get("beginningMonth")
    start_year = project.get("beginningYear")
    start_date: str | None = (
        f"{start_month}/{start_year}" if start_month is not None and start_year is not None else None
    )

    skills = normalize_skills(project.get("skills"))

    verlaengerung = project.get("verlaengerung")
    endcustomer_raw = project.get("endcustomer")

    return FreelancermapProjectFields(
        external_id=external_id,
        url=url,
        title=title,
        description=description,
        agency=project.get("company") or None,
        contact_name=contact_name,
        city=(project.get("city") or "").strip() or None,
        country=_localized_name(project.get("country")),
        remote_percent=remote_percent,
        contract_type=contract_type,
        duration=duration,
        start_date=start_date,
        skills_json=json.dumps(skills, ensure_ascii=False) if skills else None,
        industry=_localized_name(project.get("industry")),
        extension_possible=bool(verlaengerung) if verlaengerung is not None else None,
        endcustomer=bool(endcustomer_raw) if endcustomer_raw is not None else None,
    )


def normalize_skills(raw: object) -> list[str]:
    """Normalise the ``skills`` field of the AJAX response.

    The field is either a list or a dict with numeric string keys (``"0"``,
    ``"1"``, …). The English label is preferred; a missing ``en`` key falls back
    to ``de``.

    Args:
        raw: Value from ``project.skills`` (list, dict or None).

    Returns:
        Deduplicated list of English skill labels.
    """
    if not raw:
        return []
    items: list[object]
    if isinstance(raw, dict):
        items = list(raw.values())
    elif isinstance(raw, list):
        items = raw
    else:
        return []
    result: list[str] = []
    seen: set[str] = set()
    for item in items:
        if isinstance(item, dict):
            name: str = item.get("en") or item.get("de") or ""
            if name and name not in seen:
                seen.add(name)
                result.append(name)
    return result


def parse_posted_at(raw: object, url: str) -> datetime | None:
    """Parse the ISO-8601 datetime from ``project.created``.

    ``project.created`` looks like ``2026-04-21T11:40:17+02:00``.

    Args:
        raw: Value from ``project.created``.
        url: Project URL, used for logging.

    Returns:
        A timezone-aware datetime, or ``None`` when the value cannot be parsed.
    """
    if not isinstance(raw, str):
        logger.warning("created is not a string at %s: %r", url, raw)
        return None
    try:
        return datetime.fromisoformat(raw)
    except ValueError:
        logger.warning("Cannot parse created datetime %s at %s", raw, url)
        return None


def _localized_name(raw: object) -> str | None:
    """Return the ``nameDe`` of a nested ``{"nameDe": …}`` object, else ``None``.

    Args:
        raw: Value of a nested object field (e.g. ``country``/``industry``).

    Returns:
        The German display name, or ``None`` when the value is not a dict.
    """
    if isinstance(raw, dict):
        return raw.get("nameDe")
    return None
