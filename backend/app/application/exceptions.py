"""Context-wide error types for the ``application`` bounded context (leaf).

Centralises every application error so services, routers and adapters import
them from one place (canon B: ``<Aggregat><Cause>Error``). The classes keep the
exact behaviour of their former module-local definitions – in particular the
HTTP-near ``status_code`` carried by the request-scoped errors, which routers map
onto responses (services themselves never raise ``HTTPException``).
"""

from __future__ import annotations

from app.shared.http.exceptions import HttpStatusError


class ApplicationScoreLLMError(Exception):
    """Raised when the ``application-score`` task returns ``success=False``.

    Carries the standardised ``error_type`` string so callers can map it onto
    their own ``ApplicationScoreError``/HTTP status codes.
    """

    def __init__(self, error_type: str) -> None:
        self.error_type = error_type
        super().__init__(f"Application score task failed: {error_type}")


class ApplicationScoreError(HttpStatusError):
    """Raised when an application score run cannot be executed.

    Carries an HTTP-near ``status_code`` that the router maps to a response –
    the service itself never raises ``HTTPException``.
    """

    status_code = 422


class ApplicationPrepareError(HttpStatusError):
    """Raised when an application submission cannot be prepared.

    Carries an HTTP-near ``status_code`` that the router maps to a response –
    the service itself never raises ``HTTPException``.
    """

    status_code = 422


class ApplicationDeleteError(HttpStatusError):
    """Raised when an application submission cannot be deleted.

    Carries an HTTP-near ``status_code`` that the router maps to a response.
    """

    status_code = 404


class ApplicationStatusTransitionError(HttpStatusError):
    """Raised when a submission status transition is rejected.

    Carries an HTTP-near ``status_code`` that the router maps to a response –
    the service itself never raises ``HTTPException``.
    """

    status_code = 409


class ApplicationSendError(Exception):
    """Raised when a submission could not be sent or retried."""


class CareerEntryNotFoundError(ValueError):
    """Raised when a career entry does not exist."""


class ApplicationExperienceNotFoundError(ValueError):
    """Raised when an application experience does not exist."""


class FocusAreaNotFoundError(ValueError):
    """Raised when a focus area does not exist."""


class ProfileAlreadyExistsError(ValueError):
    """Raised when trying to create a second application profile."""


class ProfileNotFoundError(ValueError):
    """Raised when the application profile does not exist."""
