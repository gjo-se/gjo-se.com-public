"""Unit tests for the deterministic application-package prompt preparation.

``_flatten_paket`` is the single behaviour of this module: it builds the
``paket`` prompt string (mail envelope + reduced CV context) that the score run
hands to the LLM task. Pure function of its inputs – no LLM, no time/random
values, no database.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime

import pytest

from app.application.schemas.submission_schemas import SubmissionDetailOut
from app.application.services.score_paket_service import _flatten_paket

pytestmark = pytest.mark.unit

_NOW = datetime(2026, 1, 1, tzinfo=UTC)


def _submission() -> SubmissionDetailOut:
    """Build a persisted-submission DTO with a fixed mail envelope."""
    return SubmissionDetailOut(
        id=5,
        project_id=7,
        sender_profile_id=1,
        subject="Bewerbung",
        body="Guten Tag,",
        language="de",
        sender_email="person@example.test",
        recipient_email="hr@example.test",
        created_at=_NOW,
        updated_at=_NOW,
    )


def _cv_context() -> dict[str, object]:
    """Build a CV context with render-only noise and the skill area to merge."""
    return {
        "profile": {"full_name": "Greg Erdmann"},
        "photo_data_uri": "data:image/png;base64,AAAA",
        "radar_svg": "<svg/>",
        "skills_radar": [{"name": "Python"}],
        "skills": [{"name": "Python"}],
        "skill_groups": [{"label": "Languages", "skills": ["Python"]}],
        "languages": ["de"],
    }


def test_flatten_paket_builds_the_deterministic_prompt() -> None:
    """Mail envelope and reduced CV context flatten to the exact prompt string."""
    text = _flatten_paket(_submission(), _cv_context())

    lines = text.split("\n")
    assert lines[0] == "language: de"
    assert lines[1] == "subject: Bewerbung"
    assert lines[2] == ""
    assert lines[3] == "Guten Tag,"
    assert lines[4] == ""
    assert lines[5] == "cv_context:"
    assert json.loads(lines[6]) == {
        "languages": ["de"],
        "profile": {"full_name": "Greg Erdmann"},
        "skills": {
            "groups": [{"label": "Languages", "skills": ["Python"]}],
            "list": [{"name": "Python"}],
        },
    }


def test_flatten_paket_drops_render_only_keys() -> None:
    """Base64 photo, SVG and radar noise never reach the scorer prompt."""
    text = _flatten_paket(_submission(), _cv_context())

    assert "photo_data_uri" not in text
    assert "radar_svg" not in text
    assert "skills_radar" not in text


def test_flatten_paket_is_a_pure_function_of_its_inputs() -> None:
    """The same inputs always produce the same prompt (no time/random)."""
    first = _flatten_paket(_submission(), _cv_context())
    second = _flatten_paket(_submission(), _cv_context())

    assert first == second
