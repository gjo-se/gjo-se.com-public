"""Unit tests for the connection-pool guard."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.shared.db_access.consumer_label import set_consumer_label
from app.shared.db_access.pool_guard import PoolGuard, PoolGuardBlockedError

pytestmark = pytest.mark.unit

_POOL_SIZE = 10
_MAX_OVERFLOW = 10
#: total_pool = 20 → high watermark = int(20 * 0.75) = 15, unblock = int(20 * 0.5) = 10.
_HIGH_WATERMARK = 15
_UNBLOCK_AT = 10


def _guard() -> PoolGuard:
    """Build a guard with deterministic watermarks and no logging side effects."""
    return PoolGuard(pool_size=_POOL_SIZE, max_overflow=_MAX_OVERFLOW)


def _checkout(guard: PoolGuard, label: str) -> SimpleNamespace:
    """Perform one checkout for *label* and return the connection record."""
    set_consumer_label(label)
    record = SimpleNamespace()
    guard.on_checkout(object(), record, object())
    return record


def test_checkout_below_high_watermark_keeps_consumer_unblocked() -> None:
    """Below the 75% watermark no consumer is blocked."""
    guard = _guard()

    for _ in range(_HIGH_WATERMARK - 1):
        _checkout(guard, "restate:merge")

    stats = guard.get_stats()
    assert stats["total"] == _HIGH_WATERMARK - 1
    assert stats["blocked"] == []


def test_checkout_at_high_watermark_blocks_top_consumer() -> None:
    """At the 75% watermark the top consumer is blocked."""
    guard = _guard()

    for _ in range(_HIGH_WATERMARK):
        _checkout(guard, "restate:merge")

    assert guard.get_stats()["blocked"] == ["restate:merge"]


def test_checkout_of_blocked_consumer_raises() -> None:
    """A blocked consumer cannot open another connection."""
    guard = _guard()
    for _ in range(_HIGH_WATERMARK):
        _checkout(guard, "restate:merge")

    with pytest.raises(PoolGuardBlockedError, match="temporarily blocked"):
        _checkout(guard, "restate:merge")


def test_checkin_below_unblock_threshold_frees_all_consumers() -> None:
    """Dropping to the 50% threshold unblocks the previously blocked consumer."""
    guard = _guard()
    records = [_checkout(guard, "restate:merge") for _ in range(_HIGH_WATERMARK)]
    assert guard.get_stats()["blocked"] == ["restate:merge"]

    for record in records[: _HIGH_WATERMARK - _UNBLOCK_AT]:
        guard.on_checkin(object(), record)

    assert guard.get_stats()["blocked"] == []


def test_checkin_of_tracked_consumer_returns_total_to_zero() -> None:
    """A checkin of the last tracked consumer empties the active counter."""
    guard = _guard()
    record = _checkout(guard, "fastapi:admin")
    assert guard.get_stats()["total"] == 1

    guard.on_checkin(object(), record)

    assert guard.get_stats()["total"] == 0
