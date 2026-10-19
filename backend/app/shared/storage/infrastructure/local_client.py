"""LocalFileStore – filesystem-backed ObjectStore implementation.

Writes objects to ``{base_path}/{key}`` and builds URLs from
``{base_url}/{key}``. Suitable for local development and single-node setups.
"""

from __future__ import annotations

import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import override

import aiofiles
import structlog

from app.shared.storage.domain.base_contract import (
    ObjectInfo,
    ObjectNotFoundError,
    ObjectStore,
    StorageError,
)
from app.shared.storage.infrastructure.local_url_client import LocalUrlMixin

logger = structlog.get_logger(__name__)

# Sidecar suffix for object metadata: ``{key}.meta.json`` next to the object.
_META_SUFFIX = ".meta.json"


class LocalFileStore(LocalUrlMixin, ObjectStore):
    """ObjectStore implementation backed by the local filesystem.

    Args:
        base_path: Filesystem root directory for stored objects.
            Created on init if it does not exist.
        base_url: URL prefix used to build public object URLs
            (trailing slash is stripped).
    """

    def __init__(self, base_path: str, base_url: str) -> None:
        self._base_path = Path(base_path)
        self._base_url = base_url.rstrip("/")
        self._base_path.mkdir(parents=True, exist_ok=True)
        logger.info(
            "LocalFileStore initialized",
            base_path=str(self._base_path),
            base_url=self._base_url,
        )

    @override
    async def put(self, key: str, data: bytes, *, metadata: dict[str, str] | None = None) -> str:
        """Persist ``data`` under ``key`` on the local filesystem.

        When ``metadata`` is given, it is written to a sidecar file
        ``{key}.meta.json`` next to the object (no sidecar for ``None``).
        """
        target = self._base_path / key
        target.parent.mkdir(parents=True, exist_ok=True)
        try:
            async with aiofiles.open(target, "wb") as f:
                _ = await f.write(data)
            if metadata is not None:
                async with aiofiles.open(self._meta_path(key), "w", encoding="utf-8") as f:
                    _ = await f.write(json.dumps(metadata))
        except OSError:
            logger.exception("Failed to write object %s", key)
            raise StorageError(f"Failed to write object: {key}") from None
        logger.info("Object stored", key=key, size=len(data))
        return key

    def _meta_path(self, key: str) -> Path:
        """Return the sidecar metadata path for ``key`` (``{key}.meta.json``)."""
        return self._base_path / f"{key}.meta.json"

    @override
    async def get(self, key: str) -> bytes:
        """Read the raw bytes of the file stored under ``key``.

        Raises:
            ObjectNotFoundError: If the key does not exist.
        """
        target = self._base_path / key
        if not target.is_file():
            logger.warning("Object not found: %s", key)
            raise ObjectNotFoundError(f"Object not found: {key}")
        try:
            async with aiofiles.open(target, "rb") as f:
                data = await f.read()
        except OSError:
            logger.exception("Failed to read object %s", key)
            raise StorageError(f"Failed to read object: {key}") from None
        logger.info("Object read", key=key, size=len(data))
        return data

    @override
    async def list(self, prefix: str) -> list[ObjectInfo]:
        """List all objects under the folder ``prefix``.

        The returned keys are reconstructed from the real filesystem path, so a
        bare folder prefix (``"journey"``) and its slash form (``"journey/"``)
        yield the same, correct keys (``"journey/entry"``) – matching the S3
        backend's prefix semantics. ``createdAt`` comes from the file's ``mtime``
        (UTC); ``name`` is read from the ``{key}.meta.json`` sidecar when present,
        otherwise it falls back to the key (legacy assets). Sidecar files
        themselves are never listed as objects.
        """
        search_dir = self._base_path / prefix
        if not search_dir.is_dir():
            return []
        try:
            entries = os.listdir(search_dir)
        except OSError:
            logger.exception("Failed to list prefix %s", prefix)
            raise StorageError(f"Failed to list prefix: {prefix}") from None
        objects: list[ObjectInfo] = []
        for entry in entries:
            if not (search_dir / entry).is_file() or entry.endswith(_META_SUFFIX):
                continue
            # Reconstruct the key from the real path (relative to the store root)
            # so a bare folder prefix (``"journey"``) yields ``journey/entry``
            # exactly like the S3 backend's prefix match – never ``journeyentry``
            # via naive string concatenation.
            key = (search_dir / entry).relative_to(self._base_path).as_posix()
            objects.append(
                ObjectInfo(
                    key=key,
                    name=self._read_sidecar_name(key),
                    createdAt=self._read_mtime(key),
                )
            )
        return sorted(objects, key=lambda info: info.key)

    def _read_sidecar_name(self, key: str) -> str:
        """Return the original filename from the sidecar, or the key itself."""
        try:
            with open(self._meta_path(key), encoding="utf-8") as f:
                metadata: dict[str, str] = json.load(f)
        except (OSError, ValueError):
            return key
        return metadata.get("filename") or key

    def _read_mtime(self, key: str) -> datetime:
        """Return the object's modification time as a UTC datetime."""
        try:
            mtime = os.path.getmtime(self._base_path / key)
        except OSError:
            logger.warning("Failed to read mtime for %s – using epoch", key)
            return datetime.fromtimestamp(0, tz=UTC)
        return datetime.fromtimestamp(mtime, tz=UTC)

    @override
    async def exists(self, key: str) -> bool:
        """Return whether the file exists under ``key``."""
        return (self._base_path / key).is_file()

    @override
    async def delete(self, key: str) -> None:
        """Remove the object at ``key`` from the filesystem.

        Raises:
            ObjectNotFoundError: If the key does not exist.
        """
        target = self._base_path / key
        if not target.exists():
            logger.warning("Delete failed – object not found: %s", key)
            raise ObjectNotFoundError(f"Object not found: {key}")
        try:
            os.remove(target)
        except OSError:
            logger.exception("Failed to delete object %s", key)
            raise StorageError(f"Failed to delete object: {key}") from None
        logger.info("Object deleted", key=key)
