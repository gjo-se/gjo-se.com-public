"""LocalFileStore URL mixin – builds public URLs from the configured base URL.

Split out of :mod:`app.shared.storage.infrastructure.local_client`: the URL
concern only ever reads ``self._base_url`` and is independent of the
filesystem-I/O concerns, so it lives in its own module.
"""

from __future__ import annotations


class LocalUrlMixin:
    """Mixin providing :meth:`get_url` for filesystem-backed stores.

    Expects the concrete store to set ``self._base_url`` in its constructor.
    """

    # Initialised by the concrete store; the default keeps the mixin self-contained.
    _base_url: str = ""

    async def get_url(self, key: str) -> str:
        """Build a public URL for ``key`` from the configured base URL."""
        return f"{self._base_url}/{key}"
