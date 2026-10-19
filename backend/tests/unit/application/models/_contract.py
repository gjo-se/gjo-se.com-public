"""Shared metadata-contract helpers for application ORM model unit tests.

The application model tests assert the observable schema contract (table name,
column nullability/defaults, unique constraints, foreign-key cascade) without
touching a database – the house pattern already used by the fbf/shared model
tests. These helpers keep that contract readable and DRY across the models.
"""

from __future__ import annotations

from typing import Any


def unique_constraint_columns(model: type[Any], name: str) -> set[str]:
    """Return the column names of the named unique constraint on ``model``.

    Args:
        model: Mapped ORM class.
        name: Constraint name (e.g. ``uq_application_profile_translation_profile_locale``).

    Returns:
        The set of column names the constraint spans.

    Raises:
        StopIteration: If no constraint with that name exists.
    """
    constraint = next(c for c in model.__table__.constraints if c.name == name)
    return {column.name for column in constraint.columns}


def column_names(model: type[Any]) -> set[str]:
    """Return the set of mapped column names on ``model``."""
    return set(model.__table__.c.keys())


def foreign_key_for_column(model: type[Any], column_name: str) -> tuple[str, str | None]:
    """Return ``(target_fullname, ondelete)`` for a column's foreign key.

    Args:
        model: Mapped ORM class.
        column_name: Local foreign-key column (e.g. ``application_profile_id``).

    Returns:
        The ``target_fullname`` (e.g. ``application_profile.id``) and the
        ``ondelete`` rule (e.g. ``CASCADE``).

    Raises:
        StopIteration: If the column carries no foreign key.
    """
    foreign_key = next(fk for fk in model.__table__.foreign_keys if fk.parent.name == column_name)
    return foreign_key.target_fullname, foreign_key.ondelete
