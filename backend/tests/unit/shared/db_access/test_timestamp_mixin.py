"""Unit tests for the reusable timestamp columns mixin."""

from __future__ import annotations

import pytest
from sqlalchemy import Integer
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.shared.db_access.timestamp_mixin import TimestampMixin

pytestmark = pytest.mark.unit


class _SampleBase(DeclarativeBase):
    """Private declarative base for the sample model.

    The sample must not register on the application-wide ``Base.metadata``:
    the DB cleanup truncates every table of that metadata, and a sample table
    that only exists here would make that ``TRUNCATE`` fail for the whole suite.
    """


class _TimestampSample(TimestampMixin, _SampleBase):
    """Sample model inheriting the mixin to expose its columns."""

    __tablename__ = "test_timestamp_mixin_sample"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)


def test_timestamp_mixin_adds_required_created_at_column() -> None:
    """The mixin contributes a non-nullable created_at column."""
    column = _TimestampSample.__table__.c.created_at

    assert column.nullable is False
    assert column.server_default is not None
    assert column.type.timezone is True
    assert column.onupdate is None


def test_timestamp_mixin_adds_updated_at_with_server_onupdate() -> None:
    """updated_at carries an onupdate expression so it refreshes on write."""
    column = _TimestampSample.__table__.c.updated_at

    assert column.nullable is False
    assert column.server_default is not None
    assert column.type.timezone is True
    assert column.onupdate is not None
