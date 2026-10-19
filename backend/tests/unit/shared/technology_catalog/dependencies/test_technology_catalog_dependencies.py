"""Unit tests for the shared technology_catalog composition-root providers."""

from __future__ import annotations

import pytest

from app.shared.technology_catalog.dependencies.technology_catalog_dependencies import (
    get_catalog_source_client,
    get_technology_query_service,
    get_technology_service,
)
from app.shared.technology_catalog.infrastructure.catalog_source_client import CatalogSourceClient
from app.shared.technology_catalog.services.technology_service import (
    TechnologyQueryService,
    TechnologyService,
)

pytestmark = pytest.mark.unit


def test_get_catalog_source_client_returns_client_instance() -> None:
    """The provider builds a concrete CatalogSourceClient."""
    assert isinstance(get_catalog_source_client(), CatalogSourceClient)


def test_get_technology_service_returns_service_instance() -> None:
    """The provider builds a stateless TechnologyService."""
    assert isinstance(get_technology_service(), TechnologyService)


def test_get_technology_query_service_returns_query_service_instance() -> None:
    """The provider builds a stateless TechnologyQueryService."""
    assert isinstance(get_technology_query_service(), TechnologyQueryService)
