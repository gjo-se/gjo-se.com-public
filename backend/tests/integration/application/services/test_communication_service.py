"""Integration tests for the communication service (real Postgres)."""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.models.submission import Submission
from app.application.schemas.communication_schemas import (
    CommunicationCreate,
    CommunicationUpdate,
)
from app.application.services import communication_service

pytestmark = pytest.mark.integration


async def test_get_communication_raises_404_when_missing(db_session: AsyncSession) -> None:
    """An unknown id is reported as HTTP 404."""
    with pytest.raises(HTTPException) as exc:
        await communication_service.get_communication(db_session, 999_999)

    assert exc.value.status_code == 404


async def test_create_communication_raises_404_for_unknown_submission(db_session: AsyncSession) -> None:
    """A communication cannot be created for a missing submission."""
    with pytest.raises(HTTPException) as exc:
        await communication_service.create_communication(
            db_session, submission_id=999_999, data=CommunicationCreate(subject="Anruf")
        )

    assert exc.value.status_code == 404


async def test_create_communication_persists_for_the_submission(
    db_session: AsyncSession, app_submission: Submission
) -> None:
    """A valid create returns the persisted communication."""
    created = await communication_service.create_communication(
        db_session,
        submission_id=app_submission.id,
        data=CommunicationCreate(subject="Rückruf", summary="Sehr interessiert"),
    )

    assert created.id is not None
    assert created.subject == "Rückruf"
    assert created.application_submission_id == app_submission.id


async def test_update_communication_applies_only_set_fields(
    db_session: AsyncSession, app_submission: Submission
) -> None:
    """A partial update leaves unset fields untouched."""
    created = await communication_service.create_communication(
        db_session, submission_id=app_submission.id, data=CommunicationCreate(subject="Alt", summary="Notiz")
    )

    updated = await communication_service.update_communication(
        db_session, created.id, CommunicationUpdate(subject="Neu")
    )

    assert updated.subject == "Neu"
    assert updated.summary == "Notiz"


async def test_delete_communication_removes_the_entry(db_session: AsyncSession, app_submission: Submission) -> None:
    """A deleted communication can no longer be resolved."""
    created = await communication_service.create_communication(
        db_session, submission_id=app_submission.id, data=CommunicationCreate(subject="Weg")
    )

    await communication_service.delete_communication(db_session, created.id)

    with pytest.raises(HTTPException):
        await communication_service.get_communication(db_session, created.id)
