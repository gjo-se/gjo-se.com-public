"""Unit tests for the technology-sync repository (pure helpers + fake session).

The DB-bound module is exercised with a fake session at the system boundary
(unit-kanon "Unit ohne DB"): no real DB, no ``AsyncSession``, no DB fixtures.
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from app.shared.technology_catalog.repositories import technology_sync_repository
from app.shared.technology_catalog.repositories.technology_sync_repository import (
    _build_technology_values,
    _extract_icon_external_id,
    _map_color,
    _resolve_slug_collision,
    ensure_icons,
    finalize_import_run,
    mark_deprecated,
    upsert_technology,
)
from app.shared.technology_catalog.schemas.catalog_source_schemas import CatalogSourceTechnologyOut
from app.shared.technology_catalog.schemas.technology_schemas import TechnologySyncResultOut

pytestmark = pytest.mark.unit


def _entry(**overrides: object) -> CatalogSourceTechnologyOut:
    """Build a catalog source entry with sensible defaults and overrides."""
    base: dict[str, object] = {"id": "ext-1", "name": "PostgreSQL"}
    base.update(overrides)
    return CatalogSourceTechnologyOut(**base)


# ── Pure mapping helpers ──────────────────────────────────────────────────────


def test_map_color_translates_catalog_source_palette() -> None:
    """Known catalog source colours map to catalog tokens; unknown/None map to gray."""
    assert _map_color("Purple") == "violet"
    assert _map_color("dark-blue") == "sky"
    assert _map_color("chartreuse") == "gray"
    assert _map_color(None) == "gray"


def test_extract_icon_external_id_reads_variant_url() -> None:
    """The icon id is extracted from the variant URL path."""
    assert _extract_icon_external_id("https://cdn.test/icons/dark/abc123.png") == "abc123"


def test_extract_icon_external_id_returns_none_for_missing_url() -> None:
    """A missing or unparseable URL yields None."""
    assert _extract_icon_external_id(None) is None
    assert _extract_icon_external_id("https://example.test/no-id") is None


def test_build_technology_values_falls_back_to_slugified_name() -> None:
    """Without a defaultSlug the slug is derived from the name; colour is mapped."""
    values = _build_technology_values(_entry(name="Apache Kafka", color="yellow", defaultSlug=None))

    assert values["slug"] == "apache-kafka"
    assert values["color_token"] == "yellow"
    assert values["external_id"] == "ext-1"


def test_build_technology_values_prefers_default_slug() -> None:
    """A provided defaultSlug is kept verbatim."""
    values = _build_technology_values(_entry(defaultSlug="pg"))

    assert values["slug"] == "pg"


# ── DB-facing helpers (fake session) ─────────────────────────────────────────


class _Scalars:
    """Query result double exposing ``all()`` for scalar collections."""

    def __init__(self, rows: list[Any]) -> None:
        self._rows = rows

    def all(self) -> list[Any]:
        return self._rows


class _ExecuteResult:
    """Query result double for ``execute()``."""

    def __init__(self, rows: list[Any]) -> None:
        self._rows = rows

    def all(self) -> list[Any]:
        return self._rows

    def scalars(self) -> _Scalars:
        return _Scalars(self._rows)


class _QueueDB:
    """Session double returning queued ``scalar()`` values and recording adds."""

    def __init__(self, scalars: list[Any]) -> None:
        self._queue = list(scalars)
        self.added: list[Any] = []

    async def scalar(self, _stmt: Any) -> Any:
        return self._queue.pop(0) if self._queue else None

    def add(self, obj: Any) -> None:
        self.added.append(obj)

    async def flush(self) -> None:
        for obj in self.added:
            if getattr(obj, "id", None) is None:
                obj.id = 99


@pytest.mark.asyncio
async def test_resolve_slug_collision_returns_free_slug() -> None:
    """An unused slug is returned unchanged."""
    assert await _resolve_slug_collision(_QueueDB([None]), "abc", exclude_id=None) == "abc"


@pytest.mark.asyncio
async def test_resolve_slug_collision_appends_numeric_suffix() -> None:
    """The first conflicting slug yields a ``-3`` suffix on the second attempt."""
    assert await _resolve_slug_collision(_QueueDB([1, None]), "abc", exclude_id=None) == "abc-3"


@pytest.mark.asyncio
async def test_resolve_slug_collision_gives_up_after_ten_attempts() -> None:
    """Ten consecutive conflicts yield None."""
    assert await _resolve_slug_collision(_QueueDB([1] * 10), "abc", exclude_id=None) is None


@pytest.mark.asyncio
async def test_upsert_technology_creates_new_row() -> None:
    """A new entry is inserted, counted as created and returns the new id."""
    result = TechnologySyncResultOut()
    db = _QueueDB([None, None])  # no existing row, slug free

    tech_id = await upsert_technology(db, _entry(id="e1", name="Python"), result)

    assert result.created == 1
    assert tech_id == 99
    assert db.added


@pytest.mark.asyncio
async def test_upsert_technology_unchanged_does_not_count_update() -> None:
    """An entry identical to the stored row is counted as unchanged."""
    entry = _entry(id="e1", name="Python")
    values = _build_technology_values(entry)
    existing = SimpleNamespace(**values)
    existing.id = 5
    result = TechnologySyncResultOut()

    tech_id = await upsert_technology(_QueueDB([existing]), entry, result)

    assert result.unchanged == 1
    assert result.updated == 0
    assert tech_id == 5


@pytest.mark.asyncio
async def test_upsert_technology_updates_changed_row() -> None:
    """A changed field is written and counted as an update."""
    entry = _entry(id="e1", name="Python")
    values = _build_technology_values(entry)
    existing = SimpleNamespace(**values)
    existing.id = 5
    existing.name = "Old"
    result = TechnologySyncResultOut()
    db = _QueueDB([existing])

    await upsert_technology(db, entry, result)

    assert result.updated == 1
    assert existing.name == "Python"


@pytest.mark.asyncio
async def test_ensure_icons_adds_only_missing_variants() -> None:
    """Only variants not yet stored are added as icon rows."""

    class _IconDB:
        def __init__(self, existing: list[str]) -> None:
            self._existing = existing
            self.added: list[Any] = []

        async def execute(self, _stmt: Any) -> _ExecuteResult:
            return _ExecuteResult(list(self._existing))

        def add(self, obj: Any) -> None:
            self.added.append(obj)

    db = _IconDB(["dark"])
    entry = _entry(
        iconUrlDark="https://cdn.test/icons/dark/abc.png",
        iconUrlLight="https://cdn.test/icons/light/def.png",
    )

    await ensure_icons(db, 1, entry)

    assert [icon.variant for icon in db.added] == ["light"]


@pytest.mark.asyncio
async def test_mark_deprecated_counts_entries_missing_from_fetch(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Only technologies absent from the fetched id set are deprecated."""
    if technology_sync_repository._Statusable is None:
        pytest.skip("core_statusable not available in this environment")

    async def _resolve(_db: Any, _name: str) -> int:
        return 1

    monkeypatch.setattr(technology_sync_repository, "resolve_status_id", _resolve)

    class _DB:
        def __init__(self, rows: list[tuple[int, str]]) -> None:
            self._rows = rows
            self.added: list[Any] = []

        async def execute(self, _stmt: Any) -> _ExecuteResult:
            return _ExecuteResult(self._rows)

        def add(self, obj: Any) -> None:
            self.added.append(obj)

    db = _DB([(1, "keep"), (2, "gone")])

    count = await mark_deprecated(db, {"keep"})

    assert count == 1


@pytest.mark.asyncio
async def test_finalize_import_run_persists_counts() -> None:
    """Finalizing sets status/complete timestamp and copies the counters."""

    class _DB:
        def __init__(self) -> None:
            self.committed = False

        def add(self, _obj: Any) -> None:
            pass

        async def commit(self) -> None:
            self.committed = True

    run = SimpleNamespace()
    result = TechnologySyncResultOut(created=1, updated=2, unchanged=3, errors=4)
    db = _DB()

    await finalize_import_run(db, run, result, 10)

    assert run.status == "completed"
    assert run.total_fetched == 10
    assert run.created == 1
    assert run.errors == 4
    assert db.committed is True
