"""Project Enrichment Orchestration Service.

Orchestriert Company-Enrichment, Person-Enrichment, Person-Company-Linking
und Project-Person-Linking in einem Durchlauf – getriggert vom
``POST /api/v1/admin/crm/project-enrich/{id}/enrich-contacts`` Endpoint.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any, Literal

import structlog
from fastapi import HTTPException
from fastapi import status as http_status

from app.crm.infrastructure.hunter_client import HunterClientFactory, HunterError
from app.crm.repositories import (
    address_repository,
    company_repository,
    person_repository,
    project_person_repository,
)
from app.crm.schemas.address_schemas import AddressCreate
from app.crm.schemas.company_schemas import CompanyOut
from app.crm.schemas.enrich_schemas import CompanyEnrichRequest
from app.crm.schemas.person_schemas import PersonCreate, PersonOut
from app.crm.schemas.project_enrich_schemas import ProjectEnrichRequest
from app.crm.schemas.project_person_schemas import ProjectPersonCreate
from app.crm.services import company_enrichment_service, person_service
from app.crm.services.enrichment_service import enrich_person
from app.shared.db_access.session_types import AsyncSession
from app.shared.ports.project import ProjectCatalogPort, get_project_catalog_port

logger = structlog.get_logger(__name__)

#: Label marking the project's single primary contact person (partial UNIQUE).
_PRIMARY_LABEL = "primary"


async def enrich_project_contacts(
    db: AsyncSession,
    project_id: int,
    request: ProjectEnrichRequest | None = None,
    catalog: ProjectCatalogPort | None = None,
    hunter_client_factory: HunterClientFactory | None = None,
) -> dict[str, Any]:
    """Run the full enrichment pipeline for a project.

    Steps:
        0. Apply the optional request (pin existing entities / skip Hunter).
        1. Load project; validate ``company_name`` and ``contact_name``
           (each only required when the corresponding id is not pinned).
        2. Use the pinned company id or find-or-create + enrich via Hunter.io.
        3. Use the pinned person id or find-or-create + enrich via Hunter.io.
        4. Link person ↔ company (skip if already linked).
        5. Link project ↔ person (skip if already linked).

    Hunter.io failures are handled gracefully: entities are still created
    or updated, just without enrichment data. A handled failure (e.g. an
    exhausted plan quota) is surfaced as ``enrichment_details["hunter_error"]``
    so the caller can inform the user. A request without a body behaves exactly
    as before (find-or-create + Hunter).

    Args:
        db: Database session.
        project_id: Project primary key.
        request: Optional manual-enrichment request.
        catalog: Project-catalog port (fbf-owned project facts). Resolved from
            the composition root when omitted.
        hunter_client_factory: Composition-root provider for the Hunter client,
            forwarded to the company/person enrichment steps.

    Returns:
        Dict with keys: company (``CompanyOut``), person (``PersonOut``),
        project_crm_person_link_id, enrichment_details.

    Raises:
        HTTPException 422: ``company_name``/``contact_name`` missing on project
            while the corresponding id is not pinned.
        HTTPException 404: Project not found; pinned company/person not found.
        HTTPException 503: The project-catalog port is not wired.
    """
    if request is None:
        request = ProjectEnrichRequest()
    if catalog is None:
        catalog = await get_project_catalog_port()

    # ── 1. Load and validate project ──────────────────────────────────────
    project = await catalog.get_contact_facts(db, project_id)
    if project is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found",
        )

    company_name = (project.company_name or "").strip()
    contact_name = (project.contact_name or "").strip()

    if request.crm_company_id is None and not company_name:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="company_name is required on the project",
        )
    if request.crm_person_id is None and not contact_name:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="contact_name is required on the project",
        )

    # ── 2. Build enrichment details (mark a skipped Hunter run) ────────────
    enrichment_details: dict[str, bool | str] = {
        "company_enriched": False,
        "person_enriched": False,
    }
    if request.skip_hunter:
        enrichment_details["hunter_skipped"] = True

    record_hunter_error = _make_hunter_error_recorder(enrichment_details)

    # ── 3 + 4. Resolve company and person (pinned id or find-or-create) ────
    company = await _resolve_company(
        db,
        request,
        company_name,
        project.endcustomer,
        enrichment_details,
        record_hunter_error,
        hunter_client_factory,
    )
    person = await _resolve_contact_person(
        db,
        request,
        company,
        contact_name,
        enrichment_details,
        record_hunter_error,
        hunter_client_factory,
    )

    # ── 5 + 6. Person ↔ Company and Project ↔ Person links ────────────────
    pp_link_id = await _link_person_and_project(db, project_id, person, company)

    logger.info(
        "Project enrichment complete for project %d: company=%s, person=%s",
        project_id,
        company.id,
        person.id,
    )

    return {
        "company": company,
        "person": person,
        "project_crm_person_link_id": pp_link_id,
        "enrichment_details": enrichment_details,
    }


def _make_hunter_error_recorder(
    enrichment_details: dict[str, bool | str],
) -> Callable[[HunterError], None]:
    """Return a callback that records the first Hunter failure in details.

    Only the first error is kept (``setdefault``) – company and person lookups
    typically fail for the same reason (e.g. exhausted plan quota).
    """

    def record(error: HunterError) -> None:
        enrichment_details.setdefault("hunter_error", error.code)
        if error.detail:
            enrichment_details.setdefault("hunter_error_message", error.detail)

    return record


def _company_type_for_project(endcustomer: bool | None) -> Literal["endcustomer", "broker"] | None:
    """Derive the company kind from the project's ``endcustomer`` flag.

    ``True`` = Endkunde, ``False`` = Vermittler, ``None`` = unknown.
    """
    if endcustomer is True:
        return "endcustomer"
    if endcustomer is False:
        return "broker"
    return None


async def _resolve_company(
    db: AsyncSession,
    request: ProjectEnrichRequest,
    company_name: str,
    endcustomer: bool | None,
    enrichment_details: dict[str, bool | str],
    on_error: Callable[[HunterError], None] | None = None,
    hunter_client_factory: HunterClientFactory | None = None,
) -> CompanyOut:
    """Return the pinned company or find-or-create + enrich one.

    Raises:
        HTTPException 404: A pinned ``crm_company_id`` does not exist.
    """
    if request.crm_company_id is not None:
        company = await company_repository.get_by_id(db, request.crm_company_id)
        if company is None:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f"Company {request.crm_company_id} not found",
            )
        return company

    company_enrich_request = CompanyEnrichRequest(
        company_name=company_name,
        company_type=_company_type_for_project(endcustomer),
    )
    company = await company_enrichment_service.enrich_company(
        db,
        company_enrich_request,
        skip_enrichment=request.skip_hunter,
        hunter_client_factory=hunter_client_factory,
        on_error=on_error,
    )
    if company.website:
        enrichment_details["company_enriched"] = True
    return company


async def _resolve_contact_person(
    db: AsyncSession,
    request: ProjectEnrichRequest,
    company: CompanyOut,
    contact_name: str,
    enrichment_details: dict[str, bool | str],
    on_error: Callable[[HunterError], None] | None = None,
    hunter_client_factory: HunterClientFactory | None = None,
) -> PersonOut:
    """Return the pinned person or resolve/create (+ optionally enrich) one.

    Raises:
        HTTPException 404: A pinned ``crm_person_id`` does not exist.
    """
    if request.crm_person_id is not None:
        person = await person_repository.get_by_id(db, request.crm_person_id)
        if person is None:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f"Person {request.crm_person_id} not found",
            )
        return person

    first_name, last_name = _parse_contact_name(contact_name)
    return await _resolve_or_enrich_person(
        db,
        first_name,
        last_name,
        company,
        enrichment_details,
        skip_hunter=request.skip_hunter,
        on_error=on_error,
        hunter_client_factory=hunter_client_factory,
    )


async def _link_person_and_project(
    db: AsyncSession,
    project_id: int,
    person: PersonOut,
    company: CompanyOut,
) -> int:
    """Link person ↔ company (via address) and project ↔ person.

    Returns the id of the project↔person link. The project link keeps the
    partial UNIQUE on ``label='primary'`` intact: when the project already has
    a primary contact for another person, the new link is demoted to
    ``secondary``.
    """
    # ── Person ↔ Company link via canonical path ──────────────────────────
    person_address_id = None
    if person.address_id is not None:
        addr = await address_repository.get_by_id(db, person.address_id)
        if addr is not None and addr.crm_company_id == company.id:
            person_address_id = addr.id  # already linked

    if person_address_id is None:
        addresses = await address_repository.list_by_company(db, company.id)
        primary = next((a for a in addresses if a.is_primary), None)
        if primary is not None:
            await person_repository.set_address(db, person.id, primary.id)
        else:
            new_addr = await address_repository.create(
                db,
                AddressCreate(crm_company_id=company.id, label="Primary", is_primary=True),
            )
            await person_repository.set_address(db, person.id, new_addr.id)

    # ── Project ↔ Person link ─────────────────────────────────────────────
    existing_pp = await project_person_repository.find_duplicate(db, project_id, person.id)
    if existing_pp is not None:
        return existing_pp.id

    project_links = await project_person_repository.find_by_project(db, project_id)
    has_primary = any(link.label == _PRIMARY_LABEL for link in project_links)
    pp_link = await project_person_repository.create(
        db,
        ProjectPersonCreate(
            project_id=project_id,
            crm_person_id=person.id,
            label="secondary" if has_primary else "primary",
        ),
    )
    return pp_link.id


_TITLE_PREFIXES: set[str] = {
    "herr",
    "frau",
    "dr",
    "prof",
    "dipl",
    "dipling",
    "mag",
}


def _is_title_prefix(token: str) -> bool:
    """Check if a token is a known title or polite prefix.

    Normalises by removing all dots and dashes before comparison,
    so ``"Dipl.-Ing."`` and ``"Dr."`` both match.
    """
    clean = token.lower().replace(".", "").replace("-", "")
    return clean in _TITLE_PREFIXES


def _parse_contact_name(contact_name: str) -> tuple[str, str]:
    """Parse a full name into first_name and last_name.

    Handles three formats:

    1. **Comma**: ``"Berntheisel, Stefan"`` → ``("Stefan", "Berntheisel")``
       Comma-separated: everything after the comma is first name (trimmed),
       everything before is last name.

    2. **Title prefix**: ``"Herr Stefan Berntheisel"`` → ``("Stefan", "Berntheisel")``
       ``"Dr. Maria Mustermann"`` → ``("Maria", "Mustermann")``
       Leading title/polite prefixes are stripped before parsing.

    3. **Normal**: ``"Stefan Berntheisel"`` → ``("Stefan", "Berntheisel")``
       Splits on the first space. If only one name remains after stripping
       prefixes, last_name defaults to ``"Unknown"``.
    """
    name = contact_name.strip()

    # ── Comma format: "Lastname, Firstname" ───────────────────────────
    if "," in name:
        parts = name.split(",", maxsplit=1)
        last = parts[0].strip()
        first = parts[1].strip() if len(parts) > 1 else "Unknown"
        if first:
            return first, last
        return "Unknown", last

    # ── Strip title prefixes ──────────────────────────────────────────
    tokens = name.split()
    while tokens and _is_title_prefix(tokens[0]):
        tokens.pop(0)

    if not tokens:
        return "Unknown", "Unknown"

    # ── Normal format: "First [Middle] Last" ──────────────────────────
    if len(tokens) > 1:
        first = tokens[0]
        last = " ".join(tokens[1:])  # Multi-word last names
        return first, last

    return tokens[0], "Unknown"


async def _resolve_person(
    db: AsyncSession,
    first_name: str,
    last_name: str,
    company: CompanyOut,
) -> PersonOut | None:
    """Resolve an existing person via the match cascade (first hit wins).

    Cascade:
        1. Name + linked company (avoids surname collisions).
        2. Name only (legacy behaviour).

    A real email is only known after enrichment, so the email-based dedup is
    enforced by the collision guard in :func:`_resolve_or_enrich_person`.

    Args:
        db: Database session.
        first_name: Parsed first name.
        last_name: Parsed last name.
        company: Resolved company used for the name+company match.

    Returns:
        Matching person DTO or ``None``.
    """
    person = await person_repository.find_by_name_and_company(db, first_name, last_name, company.id)
    if person is not None:
        return person
    return await person_repository.find_by_name(db, first_name, last_name)


async def _resolve_or_enrich_person(
    db: AsyncSession,
    first_name: str,
    last_name: str,
    company: CompanyOut,
    enrichment_details: dict[str, bool | str],
    skip_hunter: bool = False,
    on_error: Callable[[HunterError], None] | None = None,
    hunter_client_factory: HunterClientFactory | None = None,
) -> PersonOut:
    """Resolve, create, and enrich the project's contact person.

    Creates the person with ``email=NULL`` when no existing match is found,
    enriches it via Hunter.io, then applies the collision guard: a real email
    that already belongs to another person wins, and a person created in this
    run is discarded. Sets ``enrichment_details["person_enriched"]``.

    When ``skip_hunter`` is ``True``, ``enrich_person`` (and with it the
    email-collision guard, since no email is known) is skipped entirely.
    """
    person = await _resolve_person(db, first_name, last_name, company)
    created_person = False

    if person is None:
        person = await person_service.create_person(
            db,
            PersonCreate(first_name=first_name, last_name=last_name),
            hunter_client_factory=hunter_client_factory,
        )
        await db.flush()
        created_person = True

    if skip_hunter:
        return person

    company_domain = company.website or ""
    person = await enrich_person(
        db, person, company_domain, on_error=on_error, hunter_client_factory=hunter_client_factory
    )

    # A known real email must not keep a freshly created person row.
    if person.email:
        existing_person = await person_repository.get_by_email_excluding(db, person.email, person.id)
        if existing_person is not None:
            if created_person:
                await person_repository.delete(db, person.id)
            person = existing_person

    if person.confidence_score is not None:
        enrichment_details["person_enriched"] = True
    return person
