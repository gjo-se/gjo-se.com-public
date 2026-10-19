"""Unit tests for the taggable-assignment router surface."""

from __future__ import annotations

import pytest
from fastapi import APIRouter

from app.shared.tagging.router.tag_router import router as tag_router
from app.shared.tagging.router.taggable_router import router as taggable_router

pytestmark = pytest.mark.unit


def _routes(router: APIRouter) -> set[tuple[str, str]]:
    """Return (path, method) pairs so GET and PUT on the same path stay distinct."""
    pairs: set[tuple[str, str]] = set()
    for route in router.routes:
        for method in getattr(route, "methods", set()) or set():
            pairs.add((route.path, method))
    return pairs


def test_taggable_router_exposes_assignment_endpoints() -> None:
    """The taggable router owns the taggable assignment + usage endpoints."""
    assert isinstance(taggable_router, APIRouter)
    routes = _routes(taggable_router)
    assert {
        ("/tagging/taggable/{taggable_type}/{taggable_id}", "GET"),
        ("/tagging/taggable/{taggable_type}/{taggable_id}", "PUT"),
        ("/tagging/tags/{tag_id}/usage", "GET"),
    } <= routes


def test_tag_router_exposes_crud_endpoints() -> None:
    """The tag router keeps the tag CRUD endpoints."""
    assert isinstance(tag_router, APIRouter)
    routes = _routes(tag_router)
    assert {
        ("/tagging/tags", "GET"),
        ("/tagging/tags", "POST"),
        ("/tagging/tags/{tag_id}", "PATCH"),
        ("/tagging/tags/{tag_id}", "DELETE"),
        ("/tagging/taggable-types", "GET"),
    } <= routes
