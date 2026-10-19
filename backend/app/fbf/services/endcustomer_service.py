"""Endcustomer-Service: Confirm/Reject-Business-Logik.

Verarbeitet die Bestaetigung/Ablehnung eines Endkunden-Kandidaten:
- Confirm: Candidate → accepted, Slave-Projekt anlegen, CRM-Company + Person
  ueber den ``CrmContactPort`` (Owner ``app.crm``) verknuepfen,
  ``project.endcustomer=true``.
- Reject: Candidate → rejected.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import structlog
from fastapi import HTTPException, status

from app.fbf.repositories import project_endcustomer_candidate_repository as candidate_repo
from app.fbf.repositories import project_repository
from app.shared.db_access.session_types import AsyncSession
from app.shared.ports.crm_contact import get_crm_contact_port
from app.shared.status.repositories import status_repository, statusable_repository

logger = structlog.get_logger(__name__)


async def confirm_candidate(db: AsyncSession, candidate_id: int) -> dict[str, Any]:
    """Confirm an endcustomer candidate: accept + CRM creation.

    Args:
        db: Async DB session (gjo_se_com).
        candidate_id: Candidate primary key.

    Returns:
        Dict with ``company_id``, ``person_id``, ``slave_id``.

    Raises:
        HTTPException 404: Candidate not found.
        HTTPException 409: Candidate already accepted/rejected.
        HTTPException 404: Master project not found.
    """
    candidate = await candidate_repo.get_ref_by_id(db, candidate_id)
    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate {candidate_id} not found",
        )

    current_status = await statusable_repository.get_status(db, "project_endcustomer_candidate", candidate.id)
    current_name = current_status.status.name if current_status else None
    if current_name != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Candidate {candidate_id} is already {current_name or 'unknown'}",
        )

    # 1. Candidate → accepted via core_statusable
    accepted_status = await status_repository.get_by_name_and_category(db, "accepted", "project_endcustomer_candidate")
    if accepted_status:
        await statusable_repository.set_status(db, "project_endcustomer_candidate", candidate.id, accepted_status.id)
    await db.flush()

    # 2. Load master project
    master = await project_repository.get_out_by_id(db, candidate.project_id)
    if master is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Master project {candidate.project_id} not found",
        )

    # 3. Create slave project with career_page_description. The schema requires
    # a non-null, unique ``url`` for every project – the endcustomer slave has
    # no real posting, so it gets a deterministic key derived from its master.
    slave_id = await project_repository.create_slave(
        db,
        url=f"{master.url}#endcustomer/{candidate.id}",
        title=f"[Endkunde] {candidate.company_name}",
        description=candidate.career_page_description or "",
        canonical_id=master.id,
        posted_at=datetime.now(UTC),
    )

    # 4. Onboard the endcustomer company as a CRM project contact (owner: app.crm)
    crm = await get_crm_contact_port()
    contact = await crm.create_endcustomer_contact(
        db,
        project_id=master.id,
        company_name=candidate.company_name,
        domain=candidate.website or None,
    )
    company_id = contact.company_id
    person_id = contact.person_id

    # 5. Set project.endcustomer = true
    await project_repository.set_endcustomer(db, master.id, True)
    await db.commit()

    logger.info(
        "confirm_candidate: candidate_id=%d company=%s slave_id=%d person_id=%d",
        candidate_id,
        candidate.company_name,
        slave_id,
        person_id,
    )
    return {
        "candidate_id": candidate_id,
        "company_id": company_id,
        "person_id": person_id,
        "slave_id": slave_id,
    }


async def reject_candidate(db: AsyncSession, candidate_id: int) -> dict[str, Any]:
    """Reject an endcustomer candidate.

    Args:
        db: Async DB session (gjo_se_com).
        candidate_id: Candidate primary key.

    Returns:
        Dict with ``candidate_id`` and ``status``.

    Raises:
        HTTPException 404: Candidate not found.
    """
    candidate = await candidate_repo.get_ref_by_id(db, candidate_id)
    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate {candidate_id} not found",
        )

    # Reject via core_statusable
    rejected_status = await status_repository.get_by_name_and_category(db, "rejected", "project_endcustomer_candidate")
    if rejected_status:
        await statusable_repository.set_status(db, "project_endcustomer_candidate", candidate.id, rejected_status.id)
    await db.commit()

    logger.info("reject_candidate: candidate_id=%d rejected", candidate_id)
    return {"candidate_id": candidate_id, "status": "rejected"}
