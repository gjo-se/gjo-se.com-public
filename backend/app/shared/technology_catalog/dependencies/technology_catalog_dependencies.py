"""Composition-root providers for the shared technology_catalog."""

from __future__ import annotations

from app.shared.technology_catalog.infrastructure.catalog_source_client import CatalogSourceClient
from app.shared.technology_catalog.services.technology_service import (
    TechnologyQueryService,
    TechnologyService,
)


def get_catalog_source_client() -> CatalogSourceClient:
    """Provide a wired :class:`CatalogSourceClient`."""
    return CatalogSourceClient()


def get_technology_service() -> TechnologyService:
    """Provide a :class:`TechnologyService` (stateless; DB session passed per call)."""
    return TechnologyService()


def get_technology_query_service() -> TechnologyQueryService:
    """Provide a :class:`TechnologyQueryService` (stateless; DB session passed per call)."""
    return TechnologyQueryService()
