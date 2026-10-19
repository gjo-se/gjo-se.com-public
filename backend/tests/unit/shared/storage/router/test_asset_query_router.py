"""Unit tests for the object-store asset query router surface."""

from __future__ import annotations

import pytest
from fastapi import APIRouter

from app.shared.storage.router.asset_query_router import router

pytestmark = pytest.mark.unit


def test_query_router_exposes_get_assets() -> None:
    """The query router exposes ``GET /assets`` only."""
    assert isinstance(router, APIRouter)
    routes = {(route.path, tuple(sorted(route.methods))) for route in router.routes}
    assert ("/assets", ("GET",)) in routes
