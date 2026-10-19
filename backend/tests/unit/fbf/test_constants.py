"""Unit tests for the ``fbf`` shared constants.

The module is the SSOT for the freelancermap.de scraping endpoints and the
``SkillTagName`` tag vocabulary the LLM extraction chooses from. No DB, no I/O.
"""

from __future__ import annotations

import pytest

from app.fbf import constants

pytestmark = pytest.mark.unit


def test_base_url_points_to_the_portal_root() -> None:
    assert constants.BASE_URL == "https://www.freelancermap.de"


def test_search_url_is_built_from_the_base_url_with_query_and_first_page() -> None:
    assert constants.SEARCH_URL.startswith(constants.BASE_URL)
    assert "{query}" in constants.SEARCH_URL
    assert "pagenr=1" in constants.SEARCH_URL


def test_ajax_url_carries_query_and_page_placeholders() -> None:
    assert constants.AJAX_URL.startswith(constants.BASE_URL)
    assert "{query}" in constants.AJAX_URL
    assert "{page}" in constants.AJAX_URL


def test_page_bounds_match_the_documented_scraper_limits() -> None:
    assert constants.AJAX_PAGE_SIZE == 22
    assert constants.MAX_PAGES == 20


def test_skill_tag_name_enum_offers_the_twelve_curated_values() -> None:
    assert constants.SkillTagName.__members__ == {
        "LANGUAGE": constants.SkillTagName.LANGUAGE,
        "FRAMEWORK": constants.SkillTagName.FRAMEWORK,
        "CLOUD": constants.SkillTagName.CLOUD,
        "TOOL": constants.SkillTagName.TOOL,
        "AI": constants.SkillTagName.AI,
        "DATA": constants.SkillTagName.DATA,
        "SECURITY": constants.SkillTagName.SECURITY,
        "TESTING": constants.SkillTagName.TESTING,
        "DEVOPS": constants.SkillTagName.DEVOPS,
        "CONCEPT": constants.SkillTagName.CONCEPT,
        "METHOD": constants.SkillTagName.METHOD,
        "DOMAIN": constants.SkillTagName.DOMAIN,
    }


def test_skill_tag_name_resolves_its_values() -> None:
    assert constants.SkillTagName("cloud") is constants.SkillTagName.CLOUD
    assert constants.SkillTagName.AI.value == "ai"
