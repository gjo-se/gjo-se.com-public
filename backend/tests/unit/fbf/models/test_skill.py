"""Unit-Tests für das Skill-Model (fbf_skill) und das SkillTagName-Enum."""

from pathlib import Path

import pytest

from app.fbf.models.skill import Skill
from app.fbf.services.skill_extraction_service import SkillTagName
from app.shared.db_access.base import Base

_VERSIONS_DIR = Path(__file__).resolve().parents[4] / "alembic" / "gjo_se_com" / "versions"
_DROP_MIGRATION = _VERSIONS_DIR / "d0e1f2a3b4c5_drop_legacy_skill_table.py"


class TestFbfSkillModel:
    """Tests für das Skill ORM-Model."""

    @pytest.mark.unit
    def test_fbf_skill_maps_to_fbf_skill_table(self) -> None:
        assert Skill.__tablename__ == "fbf_skill"

    @pytest.mark.unit
    def test_fbf_skill_has_curation_and_analytic_fields(self) -> None:
        annotations = Skill.__annotations__

        assert "name" in annotations
        assert "importance" in annotations
        assert "level" in annotations
        assert "level_public" in annotations


class TestSkillTagName:
    """Tests für das SkillTagName-Enum (SSOT, 12 Werte)."""

    @pytest.mark.unit
    def test_enum_contains_exactly_twelve_curated_tags(self) -> None:
        expected = {
            "language",
            "framework",
            "cloud",
            "tool",
            "ai",
            "data",
            "security",
            "testing",
            "devops",
            "concept",
            "method",
            "domain",
        }

        assert {tag.value for tag in SkillTagName} == expected
        assert len(SkillTagName) == 12


class TestSkillTableMigration:
    """Tests zur Legacy-``skill``-Ablösung durch ``fbf_skill``."""

    @pytest.mark.unit
    def test_legacy_skill_table_not_registered_in_metadata(self) -> None:
        assert "skill" not in Base.metadata.tables

    @pytest.mark.unit
    def test_fbf_skill_table_registered_in_metadata(self) -> None:
        assert "fbf_skill" in Base.metadata.tables
        assert Skill.__tablename__ == "fbf_skill"

    @pytest.mark.unit
    def test_drop_legacy_skill_migration_drops_skill_table(self) -> None:
        assert _DROP_MIGRATION.is_file()

        content = _DROP_MIGRATION.read_text(encoding="utf-8")

        assert 'down_revision: str | None = "c9d0e1f2a3b4"' in content  # pragma: allowlist secret
        assert 'op.drop_table("skill")' in content
