"""Application submission prepare service (gjo_se_com).

Orchestrates the creation of exactly one complete application submission per
project: resolves the project's single ``primary`` contact person, snapshots the
recipient/sender data, renders the mail (subject/body) and the CV PDF,
persists the submission with status ``draft`` and returns it together with a
shared detail serializer used by every submission router.

No LLM is involved – mail and CV are built exclusively from backend data.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

import structlog

from app.application.exceptions import ApplicationDeleteError, ApplicationPrepareError
from app.application.infrastructure import application_mail_client
from app.application.repositories import (
    profile_repository,
    score_run_repository,
    submission_list_repository,
    submission_repository,
)
from app.application.schemas.score_schemas import ScoreRunOut
from app.application.schemas.submission_schemas import (
    StatusOut,
    SubmissionDetailOut,
    SubmissionListOut,
)
from app.application.services import cv_service
from app.shared.db_access.session_types import AsyncSession
from app.shared.pdf.services import pdf_service
from app.shared.ports.crm_contact import PrimaryContactRef, get_crm_contact_port
from app.shared.ports.project import ProjectCatalogPort
from app.shared.ports.skill import SkillCatalogPort
from app.shared.status.repositories import status_repository, statusable_repository
from app.shared.storage.infrastructure.factory_client import get_object_store

logger = structlog.get_logger(__name__)

_STATUSABLE_TYPE = "application_submission"
_STATUS_CATEGORY = "application"
_DRAFT_STATUS = "draft"
#: Project status set by ``send`` – rolled back to ``favorite`` when a sent
#: submission is deleted so the project is triaged again.
_APPLIED_STATUS = "applied"
_FAVORITE_STATUS = "favorite"


@dataclass(frozen=True)
class SubmissionFilter:
    """Search/filter criteria shared by the submission list and count queries."""

    q: str | None = None
    status: str | None = None
    crm_person_id: int | None = None
    project_id: int | None = None
    from_date: date | None = None
    to_date: date | None = None


async def _resolve_primary_contact(db: AsyncSession, project_id: int) -> tuple[str, str | None, str]:
    """Resolves the project's unique ``primary`` contact and its recipient e-mail.

    The recipient address prefers the person's personal e-mail and falls back
    to the generic company e-mail (``crm_company.email``) when the person has
    none. At least one of the two must be present.

    Args:
        db: Active gjo_se_com DB session.
        project_id: Project whose primary contact is resolved.

    Returns:
        ``(display_name, company_name, recipient_email)`` – the company name is
        ``None`` when the person has no company-linked address. The display name
        is empty when the person carries no first/last name.

    Raises:
        ApplicationPrepareError: If the project has zero (422) or more than one
            (409) ``primary`` contact, or neither the person nor the company has
            an e-mail (422 – required to send the mail). A missing person name is
            allowed: the mail then uses the generic salutation.
    """
    port = await get_crm_contact_port()
    primary = await port.list_primary_contacts(db, project_id)
    if not primary:
        raise ApplicationPrepareError("Projekt hat keine primary-Kontakt-Person", status_code=422)
    if len(primary) > 1:
        raise ApplicationPrepareError("Projekt hat mehrere primary-Kontakt-Personen", status_code=409)

    contact = primary[0]
    # Personal e-mail takes precedence; the generic company address is the fallback.
    recipient_email = contact.email or contact.company_email
    if not recipient_email:
        raise ApplicationPrepareError("Kontakt-Person und Firma haben keine E-Mail-Adresse", status_code=422)
    return (_recipient_display_name(contact), contact.company_name, recipient_email)


def _recipient_display_name(contact: PrimaryContactRef) -> str:
    """Builds the recipient name from first/last name (may be empty)."""
    return " ".join(part for part in (contact.first_name, contact.last_name) if part)


async def _set_draft_status(db: AsyncSession, submission_id: int) -> None:
    """Assigns the ``draft`` status (category ``application``) to a submission.

    Raises:
        ApplicationPrepareError: If the ``draft`` status seed is missing (500).
    """
    status_obj = await status_repository.get_by_name_and_category(db, _DRAFT_STATUS, _STATUS_CATEGORY)
    if status_obj is None:
        raise ApplicationPrepareError("Status 'draft' (category=application) fehlt", status_code=500)
    await statusable_repository.set_status(db, _STATUSABLE_TYPE, submission_id, status_obj.id)


async def prepare_submission(
    db: AsyncSession,
    *,
    project_id: int,
    catalog: ProjectCatalogPort,
    skills: SkillCatalogPort,
    language: str = "de",
) -> SubmissionDetailOut:
    """Prepares and persists a complete ``draft`` submission for a project.

    Resolves the single primary contact, renders the mail and CV from backend
    data, snapshots the recipient/sender fields and stores the immutable CV
    document. The whole operation is committed as one unit.

    Args:
        db: Active gjo_se_com DB session.
        project_id: Project for which the submission is prepared.
        catalog: Project-catalog port (fbf-owned project facts).
        skills: Skill-catalog port (fbf-owned skill data).
        language: Mail language for the rendered snapshot (``de``/``en``).

    Returns:
        The persisted submission with eager-loaded ``documents`` and
        ``communications``.

    Raises:
        ApplicationPrepareError: If the project is missing (404), the
            profile/e-mail is incomplete (422), the primary contact is
            missing/ambiguous (422/409) or the status seed is absent (500). A
            project may hold several submissions – no 409 on a second prepare.
    """
    try:
        project = await catalog.get_project(db, project_id)
        if project is None:
            raise ApplicationPrepareError(f"Projekt {project_id} nicht gefunden", status_code=404)

        # A project may hold several submissions (history). Demote the previous
        # current one before inserting the new current submission so the partial
        # unique index on ``(project_id) WHERE is_current`` never sees two rows.
        await submission_repository.demote_current(db, project_id)

        profile = await profile_repository.get_profile(db)
        if profile is None or not profile.email:
            raise ApplicationPrepareError("Application Profile bzw. Profil-E-Mail fehlt", status_code=422)

        display_name, company_name, recipient_email = await _resolve_primary_contact(db, project_id)

        rendered = await application_mail_client.render_application_mail(
            db,
            catalog=catalog,
            project_id=project_id,
            recipient_name=display_name,
            company_name=company_name,
            language=language,
        )

        created = await submission_repository.create_prepared(
            db,
            project_id=project_id,
            sender_profile_id=profile.id,
            subject=rendered.subject,
            body=rendered.text,
            language=language,
            sender_email=application_mail_client.APPLICATION_SIGNATURE.email,
            reply_to_email=application_mail_client.APPLICATION_SIGNATURE.email,
            recipient_email=recipient_email,
            recipient_display_name=display_name or None,
            recipient_company_name=company_name,
            rendered=rendered,
        )

        cv_context = await cv_service.build_application_cv_context(
            db, catalog=catalog, skills=skills, project_id=project_id
        )
        pdf_bytes = await pdf_service.generate_pdf("cv", cv_context)
        _ = await cv_service.store_cv_document(db, submission=created, pdf_bytes=pdf_bytes, context=cv_context)

        await _set_draft_status(db, created.id)

        await db.commit()
        logger.info(
            "application_submission: prepared draft (submission_id=%s, project_id=%s)",
            created.id,
            project_id,
        )

        prepared = await submission_repository.get_by_id(db, created.id)
        if prepared is None:
            raise ApplicationPrepareError("Vorgang nach dem Anlegen nicht gefunden", status_code=500)
        return prepared
    except ApplicationPrepareError:
        raise
    except Exception:
        logger.exception("application_submission: prepare failed (project_id=%s)", project_id)
        raise


async def move_to_project(db: AsyncSession, *, from_project_id: int, to_project_id: int) -> bool:
    """Moves a project's current application submission to another project.

    A project may hold several submissions, but only one current one. The move
    re-points the source project's *current* submission to the target. If the
    target already carries its own current submission, the move is refused (409)
    so no submission is silently lost. The source project is left without a
    current submission afterwards.

    The caller owns the transaction and must commit.

    Args:
        db: Active gjo_se_com DB session.
        from_project_id: Project the submission currently belongs to (old master).
        to_project_id: Project the submission is moved to (new master).

    Returns:
        ``True`` when a submission was re-pointed, ``False`` when the source had
        none.

    Raises:
        ApplicationPrepareError: If the target already has a current submission
            (409).
    """
    source = await submission_repository.get_current_by_project(db, from_project_id)
    if source is None:
        return False
    target = await submission_repository.get_current_by_project(db, to_project_id)
    if target is not None:
        raise ApplicationPrepareError(
            f"Ziel-Projekt {to_project_id} hat bereits einen Bewerbungsvorgang",
            status_code=409,
        )
    await submission_repository.move_current(db, source.id, to_project_id)
    logger.info(
        "application_submission: moved to project (submission_id=%s, from=%s, to=%s)",
        source.id,
        from_project_id,
        to_project_id,
    )
    return True


async def delete_submission(db: AsyncSession, *, submission_id: int, catalog: ProjectCatalogPort) -> None:
    """Deletes a submission and all its generated artifacts.

    Cleanup beyond the DB row (documents/communications cascade):
    the stored document blobs are removed from the object store, the polymorphic
    ``core_statusable`` link is cleared, and – when the submission had been sent
    (project status ``applied``) **and** it is the project's last remaining
    submission – the project is rolled back to ``favorite`` so it is triaged
    again. Deleting one of several submissions leaves the others (incl. their
    score history) untouched.

    Args:
        db: Active gjo_se_com DB session.
        submission_id: The application_submission id.

    Raises:
        ApplicationDeleteError: If the submission is unknown (404).
    """
    submission = await submission_repository.get_by_id(db, submission_id)
    if submission is None:
        raise ApplicationDeleteError("Vorgang nicht gefunden", status_code=404)

    store = get_object_store()
    for document in submission.documents:
        try:
            await store.delete(document.storage_key)
        except Exception:
            logger.exception(
                "application_submission: blob delete failed (key=%s)",
                document.storage_key,
            )

    status_row = await statusable_repository.get_status(db, "project", submission.project_id)
    # Roll the project status back only when this is the project's last
    # submission – other submissions (and their history) keep the project's
    # applied state intact.
    remaining = await submission_list_repository.count(db, project_id=submission.project_id)
    if remaining == 1 and status_row is not None and status_row.status.name == _APPLIED_STATUS:
        await catalog.set_status(db, submission.project_id, _FAVORITE_STATUS)

    await statusable_repository.clear_status(db, _STATUSABLE_TYPE, submission_id)
    await submission_repository.delete_by_id(db, submission_id)
    await db.commit()
    logger.info("application_submission: deleted (submission_id=%s)", submission_id)


async def list_submissions(
    db: AsyncSession,
    *,
    catalog: ProjectCatalogPort,
    filters: SubmissionFilter,
    offset: int = 0,
    limit: int = 20,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> list[SubmissionListOut]:
    """Returns the paginated list for the application overview.

    Maps each repository row to ``SubmissionListOut`` and resolves the
    project title from the eager-loaded ``project`` relationship plus the status
    from the joined ``core_status`` row.

    Args:
        db: Active gjo_se_com DB session.
        catalog: Project-catalog port (resolves the project title).
        filters: Shared search/filter criteria (``q``, ``status``,
            ``crm_person_id``, ``project_id``, ``from_date``, ``to_date``).
        offset: Number of records to skip.
        limit: Maximum records per page.
        sort_by: Column to sort by (default ``created_at``).
        sort_order: ``asc`` or ``desc`` (default ``desc``).

    Returns:
        The page of list schemas with ``projectTitle`` and ``status`` populated.
    """
    crm = await get_crm_contact_port()
    project_ids: list[int] | None = None
    if filters.crm_person_id is not None:
        project_ids = await crm.get_project_ids_for_person(db, filters.crm_person_id)
    rows = await submission_list_repository.list_paginated(
        db,
        q=filters.q,
        status=filters.status,
        project_ids=project_ids,
        project_id=filters.project_id,
        from_date=filters.from_date,
        to_date=filters.to_date,
        offset=offset,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
        project_title_select=catalog.project_title_select(),
    )
    latest_runs: dict[int, ScoreRunOut] = {}
    if rows:
        latest_runs = await score_run_repository.get_latest_by_submissions(db, [out.id for out, _status in rows])
    titles = await catalog.get_titles(db, [out.project_id for out, _status in rows])
    contact_ids = await crm.get_primary_contact_ids_for_projects(db, [out.project_id for out, _status in rows])

    result: list[SubmissionListOut] = []
    for out, status_out in rows:
        title = titles.get(out.project_id)
        out.project_title = title.title if title is not None else None
        out.project_title_normalized = title.title_normalized if title is not None else None
        ids = contact_ids.get(out.project_id)
        out.recipient_person_id = ids.person_id if ids is not None else None
        out.recipient_company_id = ids.company_id if ids is not None else None
        if status_out is not None:
            out.status = status_out
        run = latest_runs.get(out.id)
        if run is not None:
            out.last_score = float(run.total_score) if run.total_score is not None else None
            out.last_verdict = run.verdict
            out.last_scored_at = run.created_at
        result.append(out)
    return result


async def count_submissions(
    db: AsyncSession,
    *,
    catalog: ProjectCatalogPort,
    filters: SubmissionFilter,
) -> int:
    """Returns the total number of submissions matching the filters.

    Args:
        db: Active gjo_se_com DB session.
        catalog: Project-catalog port (resolves the project title join).
        filters: Shared search/filter criteria (``q``, ``status``,
            ``crm_person_id``, ``project_id``, ``from_date``, ``to_date``).

    Returns:
        The filtered total count.
    """
    project_ids: list[int] | None = None
    if filters.crm_person_id is not None:
        crm = await get_crm_contact_port()
        project_ids = await crm.get_project_ids_for_person(db, filters.crm_person_id)
    return await submission_list_repository.count(
        db,
        q=filters.q,
        status=filters.status,
        project_ids=project_ids,
        project_id=filters.project_id,
        from_date=filters.from_date,
        to_date=filters.to_date,
        project_title_select=catalog.project_title_select(),
    )


async def list_project_applications(
    db: AsyncSession, *, catalog: ProjectCatalogPort, project_id: int
) -> list[SubmissionListOut]:
    """Returns all submissions of a project (history, newest first).

    Thin wrapper over ``list_submissions`` with a fixed upper bound of 100 rows
    (the router's ``le`` limit) – this increment intentionally has no pagination
    for the per-project history.

    Args:
        db: Active gjo_se_com DB session.
        project_id: Project whose submissions are listed.

    Returns:
        The project's submissions, newest first, incl. ``isCurrent`` and score.
    """
    return await list_submissions(
        db,
        catalog=catalog,
        filters=SubmissionFilter(project_id=project_id),
        offset=0,
        limit=100,
        sort_by="created_at",
        sort_order="desc",
    )


async def set_current_submission(db: AsyncSession, *, submission_id: int) -> SubmissionDetailOut:
    """Marks a submission as its project's current one and demotes the others.

    Args:
        db: Active gjo_se_com DB session.
        submission_id: The application_submission id to promote to current.

    Returns:
        The re-fetched submission with eager-loaded ``documents`` and
        ``communications``.

    Raises:
        ApplicationDeleteError: If the submission is unknown (404).
    """
    submission = await submission_repository.get_by_id(db, submission_id)
    if submission is None:
        raise ApplicationDeleteError("Vorgang nicht gefunden", status_code=404)
    await submission_repository.set_current(db, submission_id)
    await db.commit()
    updated = await submission_repository.get_by_id(db, submission_id)
    if updated is None:
        raise ApplicationDeleteError("Vorgang nicht gefunden", status_code=404)
    return updated


async def serialize_submission_detail(
    db: AsyncSession, submission: SubmissionDetailOut, catalog: ProjectCatalogPort
) -> SubmissionDetailOut:
    """Serializes a submission including its status, documents and history.

    Shared by all submission routers (prepare/read/send/status). The
    ``documents`` and ``communications`` relationships must already be loaded
    on ``submission`` (e.g. fetched via ``submission_repository``).

    Args:
        db: Active gjo_se_com DB session.
        submission: Submission to serialize.
        catalog: Project-catalog port (fbf-owned project title).

    Returns:
        The detail schema with the resolved ``status`` (or ``None``).
    """
    detail = SubmissionDetailOut.model_validate(submission)
    titles = await catalog.get_titles(db, [submission.project_id])
    title = titles.get(submission.project_id)
    detail.project_title = title.title if title is not None else None
    crm = await get_crm_contact_port()
    contact_ids = await crm.get_primary_contact_ids_for_projects(db, [submission.project_id])
    ids = contact_ids.get(submission.project_id)
    detail.recipient_person_id = ids.person_id if ids is not None else None
    detail.recipient_company_id = ids.company_id if ids is not None else None
    row = await statusable_repository.get_status(db, _STATUSABLE_TYPE, submission.id)
    if row is not None:
        detail.status = StatusOut.model_validate(row.status)
    return detail
