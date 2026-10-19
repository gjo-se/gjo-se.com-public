"""Unit tests for the ``SiteContent`` ORM model metadata (no DB).

Covers the composite primary key ``(key, language)`` and the nullable value
column that allows keys present in only one language. Pure mapper inspection.
"""

from __future__ import annotations

import pytest

from app.content_manager.models.site_content import SiteContent

pytestmark = pytest.mark.unit


def test_site_content_maps_to_namespaced_table_name() -> None:
    """The table keeps the ``content_manager_`` namespace prefix."""
    assert SiteContent.__tablename__ == "content_manager_site_content"


def test_site_content_primary_key_is_key_and_language() -> None:
    """One key may exist per language – the pair is the identity."""
    primary_key_columns = {column.name for column in SiteContent.__table__.primary_key.columns}

    assert primary_key_columns == {"key", "language"}


def test_site_content_value_is_optional() -> None:
    """A key may exist for a language without a stored value yet."""
    value_col = SiteContent.__table__.columns["value"]

    assert value_col.nullable is True


def test_site_content_updated_at_fires_on_update() -> None:
    """Every row carries an ``onupdate`` timestamp; there is no ``created_at``."""
    updated_at_col = SiteContent.__table__.columns["updated_at"]

    assert updated_at_col.onupdate is not None
    assert "created_at" not in SiteContent.__table__.columns
