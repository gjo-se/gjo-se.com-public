"""Composition-root providers for the fbf bounded context."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.infrastructure.freelancermap_mapper_client import FreelancermapMapperClient
from app.fbf.infrastructure.playwright_client import PlaywrightClient
from app.fbf.services.description_merge_service import DescriptionMergeService
from app.fbf.services.embedding_service import EmbeddingService
from app.fbf.services.freelancermap_scraping_service import FreelancermapScrapingService
from app.fbf.services.skill_extraction_service import SkillExtractionService
from app.shared.embedding.dependencies.embedding_dependencies import get_embedding_client
from app.shared.llm_gateway.client.dependencies import get_llm_client_factory


def get_embedding_service() -> EmbeddingService:
    """Provide a fresh :class:`EmbeddingService` (Project-aware embedding).

    Wiring point for the fbf embedding service. Consumers receive the service
    as a parameter (constructor / ``Depends`` / activity wiring) instead of
    instantiating it directly.
    """
    return EmbeddingService()


def get_skill_extraction_service() -> SkillExtractionService:
    """Provide a wired :class:`SkillExtractionService`."""
    return SkillExtractionService(get_embedding_client())


def get_description_merge_service() -> DescriptionMergeService:
    """Provide a wired :class:`DescriptionMergeService`."""
    return DescriptionMergeService(get_llm_client_factory())


def get_freelancermap_scraping_service(db: AsyncSession) -> FreelancermapScrapingService:
    """Provide a :class:`FreelancermapScrapingService` bound to a DB session.

    The browser is supplied via the ``PlaywrightClient`` factory so the service
    never wires its own external boundary.

    Args:
        db: Async DB session the scraper writes to.

    Returns:
        A wired :class:`FreelancermapScrapingService`.
    """
    return FreelancermapScrapingService(db, browser_factory=PlaywrightClient)


def get_freelancermap_mapper_client(
    embedding_service: EmbeddingService | None = None,
) -> FreelancermapMapperClient:
    """Provide a :class:`FreelancermapMapperClient`.

    Args:
        embedding_service: Optional embedding service for project embeddings.

    Returns:
        A wired :class:`FreelancermapMapperClient`.
    """
    return FreelancermapMapperClient(embedding_service=embedding_service)
