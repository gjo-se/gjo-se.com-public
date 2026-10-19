"""Server-side field validation for architecture objects.

Mirrors the client-side Zod rules: validates a single field value before it is
written to a node YAML file. Single responsibility of the architecture
service split — no I/O, no merge, no CRUD.
"""

from __future__ import annotations

from collections.abc import Callable

# ── Allowed Fields ─────────────────────────────────────────────────────────

ALLOWED_FIELDS = frozenset(
    {
        "name",
        "description",
        "status",
        "external",
        "tags",
        "technologies",
        "annotations",
        "type",
    }
)

_ALLOWED_STATUS_VALUES = frozenset(
    {
        "viscera-pending",
        "viscera-approved",
        "viscera-planned",
        "viscera-scan_missing",
        "viscera-deprecated",
        "viscera-rejected",
    }
)

# BE-Kanon für Objekt-Typen (R7): FE normalisiert `data_store` beim Lesen zu `store` –
# persistiert wird kanonisch `data_store`.
_ALLOWED_TYPE_VALUES = frozenset(
    {
        "system",
        "person",
        "container",
        "component",
        "data_store",
        "table",
    }
)


# ── Field Validation ──────────────────────────────────────────────────────


def _validate_name(value: object) -> None:
    """Require *value* to be a non-empty name string.

    Args:
        value: Candidate node name.

    Raises:
        ValueError: If *value* is not a non-blank string.
    """
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Name must be a non-empty string")


def _validate_description(value: object) -> None:
    """Require *value* to be a description string.

    Args:
        value: Candidate description.

    Raises:
        ValueError: If *value* is not a string.
    """
    if not isinstance(value, str):
        raise ValueError("Description must be a string")


def _validate_status(value: object) -> None:
    """Require *value* to be one of the allowed lifecycle statuses.

    Args:
        value: Candidate status value.

    Raises:
        ValueError: If *value* is not a string within the allowed set.
    """
    if not isinstance(value, str) or value not in _ALLOWED_STATUS_VALUES:
        raise ValueError(f"Status must be one of: {', '.join(sorted(_ALLOWED_STATUS_VALUES))}")


def _validate_external(value: object) -> None:
    """Require *value* to be a boolean ``external`` flag.

    Args:
        value: Candidate external flag.

    Raises:
        ValueError: If *value* is not a boolean.
    """
    if not isinstance(value, bool):
        raise ValueError("External must be a boolean")


def _validate_tags(value: object) -> None:
    """Require *value* to be a list of non-empty tag strings.

    Args:
        value: Candidate tag collection.

    Raises:
        ValueError: If *value* is not a list or holds a blank/non-string entry.
    """
    if not isinstance(value, list):
        raise ValueError("Tags must be an array")
    for i, tag in enumerate(value):
        if not isinstance(tag, str) or not tag.strip():
            raise ValueError(f"Tag at index {i} must be a non-empty string")


def _validate_technologies(value: object) -> None:
    """Require *value* to be a list of non-empty technology strings.

    Args:
        value: Candidate technology collection.

    Raises:
        ValueError: If *value* is not a list or holds a blank/non-string entry.
    """
    if not isinstance(value, list):
        raise ValueError("Technologies must be an array")
    for i, tech in enumerate(value):
        if not isinstance(tech, str) or not tech.strip():
            raise ValueError(f"Technology at index {i} must be a non-empty string")


def _validate_type(value: object) -> None:
    """Require *value* to be one of the allowed node types.

    Args:
        value: Candidate node type.

    Raises:
        ValueError: If *value* is not a string within the allowed set.
    """
    if not isinstance(value, str) or value not in _ALLOWED_TYPE_VALUES:
        raise ValueError(f"Type must be one of: {', '.join(sorted(_ALLOWED_TYPE_VALUES))}")


def _validate_annotations(value: object) -> None:
    """Require *value* to be a list of annotations.

    Args:
        value: Candidate annotation collection.

    Raises:
        ValueError: If *value* is not a list.
    """
    if not isinstance(value, list):
        raise ValueError("Annotations must be an array")


_FIELD_VALIDATORS: dict[str, Callable[[object], None]] = {
    "name": _validate_name,
    "description": _validate_description,
    "status": _validate_status,
    "external": _validate_external,
    "tags": _validate_tags,
    "technologies": _validate_technologies,
    "annotations": _validate_annotations,
    "type": _validate_type,
}


def _validate_field_value(field: str, value: object) -> None:
    """Validate the field value before writing.

    Server-side equivalent of the client-side Zod validation.
    Dispatches to the appropriate type-specific validator.
    """
    validator = _FIELD_VALIDATORS.get(field)
    if validator is None:
        raise ValueError(f"Unknown field: '{field}'")
    validator(value)
