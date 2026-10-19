"""Unit tests for the grouped CV skill-list builder.

Covers ``application_cv_skills_rules.build_cv_skill_groups``: grouping by the
curated ``group_id``, A–Z ordering within a group, group order by ``group_sort``
and the fragment/spelling-dedup rule (a partial name is dropped, independent
concepts survive). No DB, no LLM – pure data preparation.
"""

from __future__ import annotations

import pytest

from app.application.domain import application_cv_skills_rules as cv_skills
from app.shared.ports.skill import CvSkillLink

pytestmark = pytest.mark.unit


def _link(
    name: str,
    *,
    group_id: int | None = 1,
    group_sort: int | None = 0,
    group_label: str | None = "Group",
) -> CvSkillLink:
    """Build a raw CV skill link with the given group metadata."""
    return CvSkillLink(
        skill_id=abs(hash((name, group_id))) % 10_000,
        original_name=name,
        level_public=None,
        group_id=group_id,
        group_sort=group_sort,
        group_label=group_label,
    )


def test_build_returns_empty_list_for_no_rows() -> None:
    """Without rows there are no groups."""
    assert cv_skills.build_cv_skill_groups([]) == []


def test_build_groups_rows_by_group_id() -> None:
    """Rows are collected per ``group_id`` under their group label."""
    result = cv_skills.build_cv_skill_groups(
        [
            _link("Docker", group_id=1, group_label="Infra"),
            _link("Kubernetes", group_id=1, group_label="Infra"),
            _link("Scrum", group_id=2, group_label="Method"),
        ]
    )

    by_label = {group["label"]: group["skills"] for group in result}
    assert by_label["Infra"] == ["Docker", "Kubernetes"]
    assert by_label["Method"] == ["Scrum"]


def test_build_sorts_skills_alphabetically_case_insensitive() -> None:
    """Skills within a group are sorted A–Z, case-insensitive."""
    result = cv_skills.build_cv_skill_groups([_link("zope"), _link("Apache"), _link("maven")])

    assert result[0]["skills"] == ["Apache", "maven", "zope"]


def test_build_orders_groups_by_sort_then_label() -> None:
    """Groups follow ``group_sort`` ascending; the label breaks ties."""
    result = cv_skills.build_cv_skill_groups(
        [
            _link("B", group_id=2, group_sort=2, group_label="Second"),
            _link("A", group_id=1, group_sort=1, group_label="First"),
            _link("C", group_id=3, group_sort=2, group_label="AlsoSecond"),
        ]
    )

    assert [group["label"] for group in result] == ["First", "AlsoSecond", "Second"]


def test_build_drops_fragments_of_a_longer_name() -> None:
    """Partial spellings of a kept name are removed from the group."""
    result = cv_skills.build_cv_skill_groups(
        [
            _link("CI"),
            _link("CI/CD"),
            _link("Pipelines"),
            _link("CI/CD-Pipelines"),
        ]
    )

    assert result[0]["skills"] == ["CI/CD-Pipelines"]


def test_build_deduplicates_pure_spelling_variants() -> None:
    """A concept written twice with ``-``/space collapses to a single entry."""
    result = cv_skills.build_cv_skill_groups([_link("Software-Engineering"), _link("Software Engineering")])

    # The casefold-smallest spelling wins (space sorts before hyphen).
    assert result[0]["skills"] == ["Software Engineering"]


def test_build_keeps_independent_concepts() -> None:
    """Independent concepts (neither equal nor substring) all survive."""
    result = cv_skills.build_cv_skill_groups([_link("Prompt Engineering"), _link("Structured Outputs")])

    assert result[0]["skills"] == ["Prompt Engineering", "Structured Outputs"]


def test_build_treats_missing_group_id_as_zero() -> None:
    """An ungrouped row (``group_id is None``) lands in group ``0``."""
    result = cv_skills.build_cv_skill_groups([_link("Orphan", group_id=None, group_label=None)])

    assert result == [{"label": "", "skills": ["Orphan"]}]


def test_build_emits_each_original_name_once_per_group() -> None:
    """A repeated identical link does not duplicate the skill name."""
    result = cv_skills.build_cv_skill_groups([_link("Docker"), _link("Docker")])

    assert result[0]["skills"] == ["Docker"]
