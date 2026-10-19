"""Integration tests for the fbf composition-root providers.

The ``fbf_dependencies`` module is the wiring point of the fbf bounded context:
every provider must return the expected collaborator (wired, and bound to a DB
session where applicable). Only the public provider interface is asserted – no
collaborator internals are inspected.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.dependencies.fbf_dependencies import (
    get_description_merge_service,
    get_embedding_service,
    get_freelancermap_mapper_client,
    get_freelancermap_scraping_service,
    get_skill_extraction_service,
)
from app.fbf.infrastructure.freelancermap_mapper_client import FreelancermapMapperClient
from app.fbf.services.description_merge_service import DescriptionMergeService
from app.fbf.services.embedding_service import EmbeddingService
from app.fbf.services.freelancermap_scraping_service import FreelancermapScrapingService
from app.fbf.services.skill_extraction_service import SkillExtractionService

pytestmark = pytest.mark.integration


async def test_embedding_and_llm_providers_return_wired_services() -> None:
    """The stateless providers build the expected, wired collaborator types."""
    assert isinstance(get_embedding_service(), EmbeddingService)
    assert isinstance(get_skill_extraction_service(), SkillExtractionService)
    assert isinstance(get_description_merge_service(), DescriptionMergeService)


async def test_mapper_provider_returns_the_mapper_client() -> None:
    """The mapper provider returns a mapper client, optionally embedding-aware."""
    assert isinstance(get_freelancermap_mapper_client(), FreelancermapMapperClient)
    assert isinstance(get_freelancermap_mapper_client(get_embedding_service()), FreelancermapMapperClient)


async def test_scraping_provider_binds_the_supplied_db_session(db_session: AsyncSession) -> None:
    """The scraping provider wires a service bound to the given DB session."""
    service = get_freelancermap_scraping_service(db_session)

    assert isinstance(service, FreelancermapScrapingService)
