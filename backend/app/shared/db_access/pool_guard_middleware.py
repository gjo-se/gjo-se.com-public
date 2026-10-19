"""HTTP middleware that labels the DB-pool consumer per request.

Sets the consumer-label ContextVar for every request so the
:class:`app.shared.db_access.pool_guard.PoolGuard` can attribute DB checkouts to
API consumers.
"""

from collections.abc import Awaitable, Callable
from typing import override

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.shared.db_access.consumer_label import set_consumer_label


class PoolGuardLabelMiddleware(BaseHTTPMiddleware):
    """Sets the consumer label ContextVar for every HTTP request so
    :class:`PoolGuard` can attribute DB checkouts to API consumers.
    """

    @override
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        """Tag the request with a FastAPI consumer label before handling.

        Args:
            request: Incoming HTTP request.
            call_next: Downstream ASGI handler.

        Returns:
            The downstream response.
        """
        label = f"fastapi:{request.url.path}"
        set_consumer_label(label)
        return await call_next(request)
