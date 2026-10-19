"""Unit tests for the shared tagging domain enumerations."""

from __future__ import annotations

import pytest

from app.shared.tagging.domain.tagging_rules import ColorToken, StatusableType, TaggableType

pytestmark = pytest.mark.unit


def test_color_token_defines_thirteen_palette_values() -> None:
    """ColorToken exposes the documented 13-token palette."""
    assert len(ColorToken) == 13
    assert ColorToken("gray") is ColorToken.GRAY


def test_taggable_type_includes_registered_entities() -> None:
    """TaggableType lists the polymorphic taggable entity types."""
    values = {member.value for member in TaggableType}

    assert {"fbf_skill", "crm_company", "crm_person", "application_communication"} <= values


def test_statusable_type_includes_project_and_transport() -> None:
    """StatusableType lists the polymorphic statusable entity types."""
    values = {member.value for member in StatusableType}

    assert {"project", "core_notification_transport", "llm_model"} <= values


def test_invalid_statusable_type_value_raises() -> None:
    """An unregistered statusable type is rejected."""
    with pytest.raises(ValueError):
        StatusableType("not_registered")
