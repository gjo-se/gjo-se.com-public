"""FastAPI middleware that injects request-scoped context into structlog.

Binds ``request_id``, ``method`` and ``path`` via
``structlog.contextvars`` before every HTTP request so that all
subsequent log calls automatically carry the correlation id.

Also records Prometheus metrics (duration histogram, request counter,
error counter) for every request except ``/metrics`` itself.
"""

from __future__ import annotations

import time
import uuid
from collections.abc import Awaitable, Callable
from http import HTTPStatus
from typing import override

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

_HEADER_REQUEST_ID = "X-Request-ID"


class ObservabilityMiddleware(BaseHTTPMiddleware):
    """Injects ``request_id`` (UUID4) into structlog context and the
    ``X-Request-ID`` response header.

    Records Prometheus metrics for every request except ``/metrics``:

    * ``http_request_duration_seconds`` – Histogram
    * ``http_requests_total`` – Counter
    * ``http_errors_total`` – Counter (status >= 400)

    Context fields bound:

    * ``request_id`` – UUID4 string
    * ``method`` – HTTP method (GET, POST, …)
    * ``path`` – request URL path
    """

    @override
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        """Bind request context and record metrics for the request.

        Args:
            request: Incoming HTTP request.
            call_next: Downstream ASGI handler.

        Returns:
            The downstream response with the ``X-Request-ID`` header set.
        """
        request_id = str(uuid.uuid4())
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )
        try:
            # Exclude /metrics from self-recording to avoid noise
            if request.url.path == "/metrics":
                response = await call_next(request)
                response.headers[_HEADER_REQUEST_ID] = request_id
                return response

            start_time = time.perf_counter()
            response = await call_next(request)

            from app.shared.observability.infrastructure.observability_metrics_client import (
                HTTP_ERRORS_TOTAL,
                HTTP_REQUEST_DURATION,
                HTTP_REQUESTS_TOTAL,
            )

            duration = time.perf_counter() - start_time
            labels = {
                "method": request.method,
                "path": request.url.path,
                "status_code": str(response.status_code),
            }
            HTTP_REQUEST_DURATION.labels(**labels).observe(duration)
            HTTP_REQUESTS_TOTAL.labels(**labels).inc()
            if response.status_code >= HTTPStatus.BAD_REQUEST:
                HTTP_ERRORS_TOTAL.labels(**labels).inc()

            response.headers[_HEADER_REQUEST_ID] = request_id
            return response
        finally:
            structlog.contextvars.clear_contextvars()
