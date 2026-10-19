"""Override the global _prepare_db autouse fixture to skip DB schema creation.

DB schema creation (Base.metadata.create_all) fails on SQLite because
``core_status.scope`` uses ``ARRAY(Text())`` which SQLite doesn't support.
Tests in this directory don't need the database.
"""

import pytest


@pytest.fixture(autouse=True)
def _prepare_db() -> None:
    """No-op override: skip DB schema creation for parser activity unit tests."""
    yield
