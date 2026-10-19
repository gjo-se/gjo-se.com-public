"""Portfolio domain exceptions.

One canonical definition per exception, shared by the portfolio services.
Previously copied into ``portfolio_service``, ``portfolio_admin_service`` and
``portfolio_image_service``; the routers referenced them through those service
modules (still valid – each service re-imports the names).
"""

from __future__ import annotations


class PortfolioNotFoundError(ValueError):
    """Raised when a portfolio with the given slug/id does not exist."""


class PortfolioSlugConflictError(ValueError):
    """Raised when the normalized slug already belongs to another portfolio."""


class ProofNotFoundError(ValueError):
    """Raised when a proof does not exist for the given portfolio."""
