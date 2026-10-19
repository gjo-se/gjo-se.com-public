"""ObjectStore abstract base class and storage exceptions.

All application code must depend on :class:`ObjectStore`, never on a concrete
implementation. This enables swapping the storage backend (local FS, S3,
MinIO) without touching service code.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


class StorageError(Exception):
    """Base exception for all storage-related errors."""


class ObjectNotFoundError(StorageError):
    """Raised when a requested object key does not exist in the store."""


@dataclass(frozen=True)
class ObjectInfo:
    """Metadata for a stored object, returned by :meth:`ObjectStore.list`.

    Attributes:
        key: Storage key (UUID-based SSOT reference).
        name: Original filename; falls back to the key for legacy objects
            that were stored without metadata.
        createdAt: Upload timestamp (UTC).
    """

    key: str
    name: str
    createdAt: datetime


class ObjectStore(ABC):
    """Abstract interface for object/blob storage backends.

    Implementations must be async and stateless regarding individual objects.
    The store is configured once at construction time (base path, credentials,
    etc.) and reused across requests.
    """

    @abstractmethod
    async def put(self, key: str, data: bytes, *, metadata: dict[str, str] | None = None) -> str:
        """Store binary data under the given key.

        Args:
            key: Object key – may include path segments (e.g. ``"icons/foo.png"``).
            data: Raw bytes to persist.
            metadata: Optional user metadata (e.g. the original filename)
                attached to the stored object.

        Returns:
            The key under which the object was stored.
        """

    @abstractmethod
    async def get(self, key: str) -> bytes:
        """Read the raw bytes of the object stored under ``key``.

        Args:
            key: Object key.

        Returns:
            The object's bytes.

        Raises:
            ObjectNotFoundError: If the key does not exist in the store.
        """

    @abstractmethod
    async def get_url(self, key: str) -> str:
        """Return a publicly accessible URL for the given key.

        Args:
            key: Object key.

        Returns:
            URL string that resolves to the stored object.
        """

    @abstractmethod
    async def list(self, prefix: str) -> list[ObjectInfo]:
        """List all objects that start with the given prefix.

        Args:
            prefix: Key prefix to filter by (e.g. ``"test/"``).

        Returns:
            Sorted list of matching objects (relative to the store root),
            each carrying its key, original filename and upload timestamp.
        """

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Return whether an object exists under ``key``.

        Args:
            key: Object key to check.

        Returns:
            True if the object exists, False otherwise.
        """

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete the object identified by key.

        Args:
            key: Object key to remove.

        Raises:
            ObjectNotFoundError: If the key does not exist in the store.
        """
