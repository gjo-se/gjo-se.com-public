"""Shared HTTP-near domain error base.

Domain errors that carry an HTTP ``status_code`` let services signal an intended
response without importing ``fastapi.HTTPException``; routers map the code onto
the actual response. The repeated ``__init__(message, *, status_code)`` body was
duplicated across the ``application`` context and the shared ports, so the base
lives here once (``shared`` is importable by every context, while contexts must
not import each other).
"""

from __future__ import annotations


class HttpStatusError(Exception):
    """Base for domain errors carrying an HTTP-near ``status_code``.

    Subclasses set their default via the class attribute ``status_code`` and may
    override it per raise with the keyword argument.

    Attributes:
        status_code: HTTP status code the router maps onto the response.
    """

    status_code: int = 500

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        """Initialise the error.

        Args:
            message: Human-readable error message.
            status_code: Optional override of the class-level default.
        """
        super().__init__(message)
        if status_code is not None:
            self.status_code = status_code
