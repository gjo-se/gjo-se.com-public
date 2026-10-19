"""Unit tests for the pool-guard consumer-label middleware."""

from __future__ import annotations

from typing import Any

import pytest
from starlette.requests import Request
from starlette.responses import Response

from app.shared.db_access.consumer_label import get_consumer_label
from app.shared.db_access.pool_guard_middleware import PoolGuardLabelMiddleware

pytestmark = pytest.mark.unit


def _request(path: str) -> Request:
    """Build a minimal HTTP request with the given path."""
    return Request({"type": "http", "method": "GET", "path": path, "headers": [], "query_string": b""})


async def _noop_app(scope: Any, receive: Any, send: Any) -> None:
    """Minimal ASGI app stub (never called by the dispatch test)."""
    return


async def test_dispatch_sets_fastapi_consumer_label() -> None:
    """The middleware labels the request as ``fastapi:<path>`` before handling."""
    middleware = PoolGuardLabelMiddleware(app=_noop_app)

    async def _call_next(_request: Request) -> Response:
        return Response()

    await middleware.dispatch(_request("/admin/projects"), _call_next)

    assert get_consumer_label() == "fastapi:/admin/projects"
