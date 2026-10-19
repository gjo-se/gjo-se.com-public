"""Unit tests for the shared project-catalog port."""

from __future__ import annotations

import dataclasses

import pytest

from app.shared.ports.project import (
    ProjectCatalogPort,
    ProjectRef,
    ProjectTitle,
    get_project_catalog_port,
)

pytestmark = pytest.mark.unit


def test_project_ref_carries_core_project_facts() -> None:
    """The project projection carries the fields the application side consumes."""
    ref = ProjectRef(
        id=7,
        title="T",
        title_normalized="t",
        url="https://x",
        description=None,
        remote_percent=100,
        contract_type="freelance",
        start_date="10/2026",
        my_start_date=None,
        hourly_rate=90,
        my_hourly_rate=None,
        country="DE",
        canonical_id=None,
    )

    assert ref.id == 7
    assert ref.remote_percent == 100


def test_project_title_is_frozen() -> None:
    """The minimal title projection is immutable."""
    title = ProjectTitle(title="T", title_normalized="t")

    with pytest.raises(dataclasses.FrozenInstanceError):
        title.title = "X"


async def test_get_project_catalog_port_returns_wired_port() -> None:
    """The composition root wires a concrete project-catalog port."""
    assert isinstance(await get_project_catalog_port(), ProjectCatalogPort)
