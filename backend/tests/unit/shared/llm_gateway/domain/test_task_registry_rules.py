"""Unit-Tests für die TASK_REGISTRY.

Stellt sicher, dass code-bekannte Use-Cases mit ihren Platzhaltern registriert
sind – Voraussetzung für die LLMClient-Validierung.
"""

import pytest

from app.shared.llm_gateway.domain.task_registry_rules import TASK_REGISTRY


class TestTaskRegistry:
    """Tests für die registrierten LLM-Use-Cases."""

    @pytest.mark.unit
    def test_skill_extraction_is_registered(self) -> None:
        assert "skill-extraction" in TASK_REGISTRY

    @pytest.mark.unit
    def test_skill_extraction_exposes_merged_description_placeholder(self) -> None:
        definition = TASK_REGISTRY["skill-extraction"]

        placeholder_keys = {p.key for p in definition.placeholders}

        assert definition.key == "skill-extraction"
        assert placeholder_keys == {"merged_description", "known_skills", "known_job_roles"}

    @pytest.mark.unit
    def test_description_merge_remains_registered(self) -> None:
        assert "description-merge" in TASK_REGISTRY

    @pytest.mark.unit
    def test_output_mode_is_text_for_description_merge(self) -> None:
        assert TASK_REGISTRY["description-merge"].output_mode == "text"

    @pytest.mark.unit
    def test_output_mode_is_structured_for_skill_extraction(self) -> None:
        assert TASK_REGISTRY["skill-extraction"].output_mode == "structured"

    @pytest.mark.unit
    def test_inline_explain_is_registered(self) -> None:
        assert "inline-explain" in TASK_REGISTRY

    @pytest.mark.unit
    def test_inline_explain_output_mode_is_text(self) -> None:
        assert TASK_REGISTRY["inline-explain"].output_mode == "text"

    @pytest.mark.unit
    def test_inline_explain_placeholders(self) -> None:
        definition = TASK_REGISTRY["inline-explain"]
        placeholder_keys = {p.key for p in definition.placeholders}
        assert "term" in placeholder_keys
        assert "context" in placeholder_keys

    @pytest.mark.unit
    def test_task_definition_is_frozen(self) -> None:
        """TaskDefinition is immutable – assignments raise FrozenInstanceError."""
        from dataclasses import FrozenInstanceError

        with pytest.raises(FrozenInstanceError):
            TASK_REGISTRY["description-merge"].display_name = "changed"

    @pytest.mark.unit
    def test_placeholder_definition_is_frozen(self) -> None:
        """PlaceholderDefinition is immutable – assignments raise FrozenInstanceError."""
        from dataclasses import FrozenInstanceError

        placeholder = TASK_REGISTRY["description-merge"].placeholders[0]

        with pytest.raises(FrozenInstanceError):
            placeholder.key = "changed"
