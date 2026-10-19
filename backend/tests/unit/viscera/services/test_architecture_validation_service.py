"""Unit-Tests für die Server-seitige Feldvalidierung (architecture_validation_service).

Spiegelt die client-seitigen Zod-Regeln: erlaubte Felder, Status-/Typ-Enums,
Tag-/Technologie-Listen. Rein funktional – keine Datei-, Netz- oder DB-Zugriffe.
"""

from __future__ import annotations

import pytest

from app.viscera.services.architecture_validation_service import (
    _validate_field_value,
    _validate_technologies,
    _validate_type,
)

pytestmark = pytest.mark.unit


class TestValidateFieldValue:
    """Tests für _validate_field_value (Server-seitige Feldvalidierung)."""

    def test_name_non_empty_string(self) -> None:
        """Name muss non-empty String sein."""
        _validate_field_value("name", "Valid Name")  # ok
        with pytest.raises(ValueError, match="non-empty"):
            _validate_field_value("name", "")
        with pytest.raises(ValueError, match="non-empty"):
            _validate_field_value("name", "   ")
        with pytest.raises(ValueError):
            _validate_field_value("name", 123)

    def test_description_string(self) -> None:
        """Description muss ein String sein (darf leer sein)."""
        _validate_field_value("description", "A description")
        _validate_field_value("description", "")  # ok – leer erlaubt
        with pytest.raises(ValueError):
            _validate_field_value("description", None)

    def test_status_allowed_values(self) -> None:
        """Status nur aus erlaubtem Enum."""
        for val in (
            "viscera-pending",
            "viscera-approved",
            "viscera-planned",
            "viscera-scan_missing",
            "viscera-deprecated",
            "viscera-rejected",
        ):
            _validate_field_value("status", val)
        with pytest.raises(ValueError, match="Status must be one of"):
            _validate_field_value("status", "draft")
        with pytest.raises(ValueError, match="Status must be one of"):
            _validate_field_value("status", "pending")

    def test_external_boolean(self) -> None:
        """External muss Boolean sein."""
        _validate_field_value("external", True)
        _validate_field_value("external", False)
        with pytest.raises(ValueError):
            _validate_field_value("external", "yes")

    def test_tags_array_of_slugs(self) -> None:
        """Tags müssen Array von nicht-leeren Strings (Slugs) sein (Kanon R3)."""
        _validate_field_value("tags", ["backend", "critical"])
        with pytest.raises(ValueError, match="array"):
            _validate_field_value("tags", "not-a-list")
        with pytest.raises(ValueError, match="non-empty"):
            _validate_field_value("tags", [""])

    def test_annotations_array(self) -> None:
        """Annotations müssen Array sein."""
        _validate_field_value("annotations", [{"text": "note", "author": "greg"}])
        with pytest.raises(ValueError, match="array"):
            _validate_field_value("annotations", "not-a-list")


def test_validate_type_accepts_known_and_rejects_unknown() -> None:
    """A known type passes; unknown or non-string values raise."""
    _validate_type("component")

    with pytest.raises(ValueError):
        _validate_type("bogus")
    with pytest.raises(ValueError):
        _validate_type(123)


def test_validate_technologies_requires_non_blank_strings() -> None:
    """A list of non-blank strings passes; others raise."""
    _validate_technologies(["Python"])

    with pytest.raises(ValueError):
        _validate_technologies("Python")
    with pytest.raises(ValueError):
        _validate_technologies([""])
