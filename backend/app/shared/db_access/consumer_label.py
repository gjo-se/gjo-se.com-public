"""Context variable for labelling the consumer of a DB connection.

Used by :class:`PoolGuard` to attribute active checkouts to a specific
consumer (e.g. ``restate:merge``, ``fastapi:admin/projects``) so that
the guard can selectively block the top consumer when the pool is
congested.

Usage::

    from app.shared.db_access.consumer_label import consumer_label, set_consumer_label

    set_consumer_label("restate:merge")
    # ... DB operations ...

The label is automatically cleared when the context exits (ContextVar
is request/task-scoped in asyncio).
"""

from __future__ import annotations

from contextvars import ContextVar

#: Per-task consumer label for DB connection attribution.
#: Default ``"unknown"`` – set by middleware / activity entry points.
_consumer_label_var: ContextVar[str] = ContextVar("consumer_label", default="unknown")


def set_consumer_label(label: str) -> None:
    """Set the consumer label for the current async context.

    Args:
        label: Short identifier, e.g. ``"restate:merge"`` or
               ``"fastapi:admin/projects"``.
    """
    _consumer_label_var.set(label)


def get_consumer_label() -> str:
    """Return the consumer label for the current async context.

    Returns:
        The label string, defaulting to ``"unknown"`` if never set.
    """
    return _consumer_label_var.get()
