"""Render, store and regenerate the application CV PDF (gjo_se_com).

Renders the data-driven CV context (see :mod:`cv_context_service`) to PDF bytes
via the generic ``pdf_service`` and persists the result as an immutable
snapshot (object store + ``application_document`` row). No LLM is involved.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

import structlog

from app.application.repositories import document_repository
from app.application.schemas.document_schemas import DocumentOut
from app.application.schemas.submission_schemas import SubmissionDetailOut
from app.application.services import cv_context_service, cv_filename_service
from app.shared.db_access.session_types import AsyncSession
from app.shared.pdf.services import pdf_service
from app.shared.ports.project import ProjectCatalogPort
from app.shared.ports.skill import SkillCatalogPort
from app.shared.storage.domain.base_contract import ObjectNotFoundError
from app.shared.storage.infrastructure.factory_client import get_object_store

logger = structlog.get_logger(__name__)


@dataclass(frozen=True)
class RenderedApplicationCv:
    """Rendered application CV: the PDF bytes plus its download file name."""

    pdf_bytes: bytes
    filename: str


async def render_application_cv(
    db: AsyncSession,
    *,
    catalog: ProjectCatalogPort,
    skills: SkillCatalogPort,
    project_id: int | None = None,
    use_default_skills: bool = False,
) -> RenderedApplicationCv:
    """Renders the application CV to PDF bytes from backend data.

    Args:
        db: Active gjo_se_com DB session.
        catalog: Project-catalog port (fbf-owned project facts).
        skills: Skill-catalog port (fbf-owned skill data).
        project_id: Target project id. ``None`` renders the project-less CV
            (skills tagged ``site:promo``).
        use_default_skills: Render the curated default skill groups instead of
            the project's linked skills (see :func:`build_application_cv_context`).

    Returns:
        The rendered PDF bytes and the recruiter-friendly file name derived from
        the CV context (see :func:`build_cv_filename`).

    Raises:
        ValueError: If the project (when given) or the application profile does
            not exist.
    """
    context = await cv_context_service.build_application_cv_context(
        db, catalog=catalog, skills=skills, project_id=project_id, use_default_skills=use_default_skills
    )
    pdf_bytes = await pdf_service.generate_pdf("cv", context)
    return RenderedApplicationCv(pdf_bytes=pdf_bytes, filename=cv_filename_service.cv_filename_from_context(context))


def _build_render_context(context: dict[str, object]) -> dict[str, object]:
    """Derives the reproducible skill selection from the CV context.

    Args:
        context: The CV context built by
            :func:`cv_context_service.build_application_cv_context`.

    Returns:
        ``{"skills": [name, ...], "skill_groups": [...], "skills_radar": [...],
        "use_default_skills": bool}`` for the snapshot.
    """
    skills_raw = context.get("skills")
    skills = skills_raw if isinstance(skills_raw, list) else []
    return {
        "skills": [skill["name"] for skill in skills],
        "skill_groups": context.get("skill_groups") or [],
        "skills_radar": context.get("skills_radar") or [],
        "use_default_skills": bool(context.get("use_default_skills")),
    }


def _cv_uses_default_skills(documents: list[DocumentOut]) -> bool:
    """Returns the skill mode stored on the current CV snapshot.

    Reads ``use_default_skills`` from the first CV document's render context so a
    re-render without an explicit flag keeps the previously chosen mode.
    """
    for document in documents:
        context = document.render_context
        if isinstance(context, dict) and "use_default_skills" in context:
            return bool(context["use_default_skills"])
    return False


async def store_cv_document(
    db: AsyncSession,
    *,
    submission: SubmissionDetailOut,
    pdf_bytes: bytes,
    context: dict[str, object],
    filename: str | None = None,
) -> DocumentOut:
    """Stores the rendered CV as an immutable snapshot and persists its row.

    The PDF is written to the object store under a fresh, unique key (never
    overwriting an existing object) and an ``application_document`` row with
    the checksum, size and render context is created. The caller owns the
    commit – this function only flushes.

    Args:
        db: Active gjo_se_com DB session.
        submission: Persisted submission the document belongs to.
        pdf_bytes: Raw PDF bytes as produced by :func:`render_application_cv`.
        context: The CV context used for rendering.
        filename: Download file name; ``None`` derives it from ``context``
            (recruiter-friendly ``<Name>_<Referenz>_<Titel>.pdf``).

    Returns:
        The created :class:`Document`.

    Raises:
        ValueError: If ``submission`` has no id (not persisted yet).
    """
    if not submission.id:
        raise ValueError("submission must be persisted before storing its CV document")

    resolved_filename = filename or cv_filename_service.cv_filename_from_context(context)

    try:
        checksum = hashlib.sha256(pdf_bytes).hexdigest()
        key = f"application-cv/{uuid4().hex}.pdf"

        _ = await get_object_store().put(key, pdf_bytes, metadata={"filename": resolved_filename})

        created = await document_repository.create_cv_document(
            db,
            application_submission_id=submission.id,
            storage_key=key,
            filename=resolved_filename,
            mime_type="application/pdf",
            size_bytes=len(pdf_bytes),
            checksum_sha256=checksum,
            render_context=_build_render_context(context),
            generated_at=datetime.now(UTC),
        )
        logger.info(
            "application_cv: stored CV snapshot",
            submission_id=submission.id,
            storage_key=key,
        )
        return created
    except Exception:
        logger.exception(
            "application_cv: CV snapshot store failed (submission_id=%s)",
            submission.id,
        )
        raise


async def regenerate_cv_document(
    db: AsyncSession,
    *,
    submission: SubmissionDetailOut,
    catalog: ProjectCatalogPort,
    skills: SkillCatalogPort,
    use_default_skills: bool | None = None,
) -> DocumentOut:
    """Re-renders the submission's CV and replaces the previous snapshot.

    The single re-render path: builds the CV context, renders the PDF once,
    deletes the *old* CV snapshot (both the object-store object and its DB row)
    and stores the fresh snapshot via :func:`store_cv_document` (immutable key).
    Exactly one CV document remains per submission – no object accumulation.

    The caller owns the commit – this function only flushes (via
    :func:`store_cv_document` / the repository).

    Args:
        db: Active gjo_se_com DB session.
        submission: Persisted submission the CV belongs to.
        use_default_skills: ``True`` renders the curated default skill groups
            instead of the project's linked skills; ``False`` forces project
            skills; ``None`` (default) inherits the mode stored on the current
            CV snapshot, so skill adds/removes keep the chosen mode.

    Returns:
        The newly created :class:`Document`.

    Raises:
        ValueError: If the project (``submission.project_id``) or the application
            profile does not exist.
    """
    old_documents = await document_repository.get_cv_by_submission(db, submission.id)
    if use_default_skills is None:
        use_default_skills = _cv_uses_default_skills(old_documents)

    context = await cv_context_service.build_application_cv_context(
        db,
        catalog=catalog,
        skills=skills,
        project_id=submission.project_id,
        use_default_skills=use_default_skills,
    )
    pdf_bytes = await pdf_service.generate_pdf("cv", context)

    for old_document in old_documents:
        try:
            await get_object_store().delete(old_document.storage_key)
        except ObjectNotFoundError:
            logger.warning(
                "application_cv: old CV object already missing (submission_id=%s, storage_key=%s)",
                submission.id,
                old_document.storage_key,
            )
        await document_repository.delete_by_id(db, old_document.id)

    return await store_cv_document(db, submission=submission, pdf_bytes=pdf_bytes, context=context)
