"""Unit tests for the FBF embedding text builders (pure, no DB/network).

``build_embedding_text`` (raw PM entry) and ``build_embedding_text_for_project``
(normalised project) must produce the same field order/labels so their vectors
live in one space. From-values are constructed in memory – never persisted.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from app.fbf.models.project import Project
from app.fbf.models.project_freelancer_map import ProjectFreelancerMap
from app.fbf.services.embedding_service import (
    build_embedding_text,
    build_embedding_text_for_project,
)

pytestmark = pytest.mark.unit

_POSTED_AT = datetime(2026, 1, 1, tzinfo=UTC)


def _raw_entry(
    *,
    description: str | None = "Build pipelines",
    city: str | None = "Berlin",
    duration: int | None = 6,
    start_date: str | None = "03/2026",
) -> ProjectFreelancerMap:
    """Build an in-memory raw PM entry with deterministic defaults."""
    return ProjectFreelancerMap(
        external_id="ext-1",
        url="https://example.test/project/1",
        title="Data Platform Engineer",
        description=description,
        city=city,
        duration=duration,
        start_date=start_date,
        posted_at=_POSTED_AT,
        scraped_at=_POSTED_AT,
    )


def test_build_embedding_text_includes_all_present_fields() -> None:
    """A fully populated entry renders title, description, city, duration, start, posted_at."""
    text = build_embedding_text(_raw_entry())
    lines = text.splitlines()

    assert lines[0] == "title: Data Platform Engineer"
    assert "description: |" in lines
    assert "  Build pipelines" in lines
    assert "city: Berlin" in lines
    assert "duration: 6 Monate" in lines
    assert "start_date: 03/2026" in lines
    assert "posted_at: 2026-01-01" in lines


def test_build_embedding_text_skips_null_and_invalid_start_date() -> None:
    """NULL optional fields and the sentinel ``0/0`` start date are omitted."""
    text = build_embedding_text(
        _raw_entry(description=None, city=None, duration=None, start_date="0/0"),
    )

    assert text.splitlines() == ["title: Data Platform Engineer", "posted_at: 2026-01-01"]


def test_build_embedding_text_for_project_normalises_duration_suffix() -> None:
    """A bare numeric project duration renders as ``<n> Monate`` like the PM text."""
    project = Project(url="https://example.test/p", title="T", duration="6")

    assert "duration: 6 Monate" in build_embedding_text_for_project(project)


def test_build_embedding_text_for_project_omits_missing_posted_at() -> None:
    """A project without ``posted_at`` yields no posted_at line."""
    project = Project(url="https://example.test/p", title="Only Title", posted_at=None)

    assert build_embedding_text_for_project(project) == "title: Only Title"
