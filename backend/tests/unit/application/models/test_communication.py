"""Unit tests for the Communication ORM model metadata."""

from __future__ import annotations

import pytest

from app.application.models.communication import (
    Communication,
    CommunicationDirection,
    CommunicationOutcome,
    CommunicationSentiment,
    CommunicationType,
)

pytestmark = pytest.mark.unit


def test_communication_maps_to_expected_table() -> None:
    """The model is bound to ``application_communication``."""
    assert Communication.__tablename__ == "application_communication"


def test_communication_channel_enum_members() -> None:
    """The channel enum exposes the four canonical communication types."""
    assert {member.value for member in CommunicationType} == {"call", "email", "meeting", "note"}
    assert {member.value for member in CommunicationDirection} == {"inbound", "outbound", "internal"}
    assert {member.value for member in CommunicationOutcome} == {
        "positive",
        "neutral",
        "negative",
        "no_answer",
        "follow_up_needed",
    }
    assert {member.value for member in CommunicationSentiment} == {"positive", "neutral", "negative"}


def test_communication_defaults_to_a_note_outbound() -> None:
    """A new entry defaults to an outbound note that is not yet followed up."""
    table = Communication.__table__

    assert table.c.type.default.arg == CommunicationType.NOTE
    assert table.c.direction.default.arg == CommunicationDirection.OUTBOUND
    assert table.c.follow_up_done.default.arg is False
    assert table.c.follow_up_done.nullable is False


def test_communication_cascades_with_its_submission() -> None:
    """Deleting the submission removes its communication history."""
    foreign_key = next(
        fk for fk in Communication.__table__.foreign_keys if fk.parent.name == "application_submission_id"
    )

    assert foreign_key.target_fullname == "application_submission.id"
    assert foreign_key.ondelete == "CASCADE"
