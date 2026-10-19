"""Unit tests for the ObjectStore contract and storage exceptions."""

from __future__ import annotations

import dataclasses
from datetime import UTC, datetime

import pytest

from app.shared.storage.domain.base_contract import (
    ObjectInfo,
    ObjectNotFoundError,
    ObjectStore,
    StorageError,
)

pytestmark = pytest.mark.unit


def test_object_store_declares_all_contract_operations_abstract() -> None:
    """Every storage operation is declared as an abstract method."""
    assert {
        "put",
        "get",
        "get_url",
        "list",
        "exists",
        "delete",
    } <= set(ObjectStore.__abstractmethods__)


def test_object_not_found_error_is_a_storage_error() -> None:
    """The specific not-found error is part of the storage error hierarchy."""
    assert issubclass(ObjectNotFoundError, StorageError)


def test_object_info_is_frozen_with_required_fields() -> None:
    """ObjectInfo carries key/name/createdAt and is immutable."""
    info = ObjectInfo(key="a/b.png", name="b.png", createdAt=datetime(2026, 1, 1, tzinfo=UTC))

    assert info.key == "a/b.png"
    with pytest.raises(dataclasses.FrozenInstanceError):
        info.key = "other"
