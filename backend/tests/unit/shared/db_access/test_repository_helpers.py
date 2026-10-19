"""Unit tests for the domain-free repository helpers.

The helpers only build SQLAlchemy statements and delegate execution to the
session, so they are exercised with a fake session (recorded statements, fake
result) – no database, no ``AsyncSession`` reference (unit-kanon „Unit ohne
DB").
"""

from __future__ import annotations

from typing import Any

import pytest

from app.application.models.focus_area import FocusArea
from app.application.models.focus_area_translation import FocusAreaTranslation
from app.application.schemas.focus_area_schemas import FocusAreaLocaleFieldsOut
from app.shared.db_access.repository_helpers import (
    delete,
    get_by_id,
    get_max_sort,
    reorder,
    replace_translations,
    slug_exists,
    to_out,
    update,
)

pytestmark = pytest.mark.unit


class _FakeResult:
    """Minimal stand-in for a SQLAlchemy ``Result``."""

    def __init__(self, value: Any) -> None:
        self._value = value

    def scalar_one(self) -> Any:
        """Return the configured scalar."""
        return self._value

    def scalar_one_or_none(self) -> Any:
        """Return the configured scalar (or ``None``)."""
        return self._value


class _FakeSession:
    """Records statements/adds and returns a canned result."""

    def __init__(self, result: Any = None) -> None:
        self.result = result
        self.executed: list[Any] = []
        self.added: list[Any] = []
        self.flush_count = 0

    async def execute(self, statement: Any) -> _FakeResult:
        """Record the statement and return the canned result."""
        self.executed.append(statement)
        return _FakeResult(self.result)

    def add_all(self, items: Any) -> None:
        """Record added rows."""
        self.added.extend(list(items))

    async def flush(self) -> None:
        """Count flushes."""
        self.flush_count += 1


async def test_get_max_sort_returns_scalar() -> None:
    """The scope's max ``sort`` is returned as an int."""
    db: Any = _FakeSession(result=7)
    value = await get_max_sort(
        db,
        model=FocusArea,
        scope_attr=FocusArea.application_profile_id,
        scope_value=1,
    )
    assert value == 7
    assert len(db.executed) == 1


async def test_reorder_assigns_index_and_flushes() -> None:
    """Each row's ``sort`` is set to its index in ``ordered_ids``."""

    class _Row:
        sort = -1

    row = _Row()
    db: Any = _FakeSession(result=row)
    await reorder(
        db,
        model=FocusArea,
        scope_attr=FocusArea.application_profile_id,
        scope_value=1,
        ordered_ids=[10, 11],
    )
    assert row.sort == 1  # last index wins (fake returns the same row)
    assert db.flush_count == 1


async def test_replace_translations_deletes_then_adds_rows() -> None:
    """Existing rows are deleted and one row per locale is inserted."""
    db: Any = _FakeSession()
    await replace_translations(
        db,
        translation_model=FocusAreaTranslation,
        fk_attr="focus_area_id",
        owner_id=3,
        translations={"de": FocusAreaLocaleFieldsOut(title="T")},
    )
    assert len(db.executed) == 1  # DELETE
    assert len(db.added) == 1
    added = db.added[0]
    assert added.focus_area_id == 3
    assert added.locale == "de"
    assert added.title == "T"
    assert db.flush_count == 1


# ── to_out / get_by_id / update / delete / slug_exists ───────────────────────


class _Row:
    def __init__(self, **kw: Any) -> None:
        self.__dict__.update(kw)


class _Dto:
    @classmethod
    def model_validate(cls, row: Any) -> Any:
        return {"dto": row}


class _UpdateData:
    def __init__(self, payload: dict[str, Any]) -> None:
        self._payload = payload

    def model_dump(self, *, exclude_unset: bool = False) -> dict[str, Any]:
        return dict(self._payload)


class _Res:
    def __init__(self, scalar: Any) -> None:
        self._scalar = scalar

    def scalar_one(self) -> Any:
        return self._scalar


class _SessionWithGet:
    def __init__(self, row: Any = None, scalar: Any = 0) -> None:
        self.row = row
        self.scalar = scalar
        self.deleted: list[Any] = []
        self.refreshed = 0
        self.flush_count = 0
        self.executed: list[Any] = []

    async def get(self, _model: Any, _obj_id: Any) -> Any:
        return self.row

    async def delete(self, row: Any) -> None:
        self.deleted.append(row)

    async def refresh(self, _row: Any) -> None:
        self.refreshed += 1

    async def flush(self) -> None:
        self.flush_count += 1

    async def execute(self, statement: Any) -> _Res:
        self.executed.append(statement)
        return _Res(self.scalar)


def test_to_out_validates_row() -> None:
    row = _Row(id=1)
    assert to_out(row, dto_cls=_Dto) == {"dto": row}


async def test_get_by_id_returns_dto_or_none() -> None:
    row = _Row(id=1)
    assert await get_by_id(_SessionWithGet(row=row), 1, model=FocusArea, dto_cls=_Dto) == {"dto": row}
    assert await get_by_id(_SessionWithGet(row=None), 1, model=FocusArea, dto_cls=_Dto) is None


async def test_update_applies_set_fields_and_flushes() -> None:
    row = _Row(name="old", keep="keep")
    db = _SessionWithGet(row=row)
    out = await update(db, 1, _UpdateData({"name": "new"}), model=FocusArea, dto_cls=_Dto)
    assert row.name == "new"
    assert row.keep == "keep"
    assert out == {"dto": row}
    assert db.refreshed == 1
    assert db.flush_count == 1


async def test_update_returns_none_for_missing_row() -> None:
    db = _SessionWithGet(row=None)
    assert await update(db, 1, _UpdateData({"name": "x"}), model=FocusArea, dto_cls=_Dto) is None
    assert db.flush_count == 0


async def test_delete_returns_true_when_row_present() -> None:
    row = _Row(id=1)
    db = _SessionWithGet(row=row)
    assert await delete(db, 1, model=FocusArea) is True
    assert db.deleted == [row]
    assert db.flush_count == 1


async def test_delete_returns_false_when_absent() -> None:
    db = _SessionWithGet(row=None)
    assert await delete(db, 1, model=FocusArea) is False
    assert db.flush_count == 0


async def test_slug_exists_true_when_count_positive() -> None:
    db = _SessionWithGet(scalar=2)
    assert await slug_exists(db, "x", model=FocusArea) is True
    assert len(db.executed) == 1


async def test_slug_exists_false_when_count_zero() -> None:
    db = _SessionWithGet(scalar=0)
    assert await slug_exists(db, "x", model=FocusArea) is False


async def test_slug_exists_applies_exclude_id_filter() -> None:
    db = _SessionWithGet(scalar=1)
    assert await slug_exists(db, "x", model=FocusArea, exclude_id=5) is True  # extra where-clause branch
