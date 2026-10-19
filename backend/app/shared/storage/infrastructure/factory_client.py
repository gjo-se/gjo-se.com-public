"""ObjectStore factory – builds the configured store implementation.

Usage::

    from app.shared.storage.infrastructure.factory_client import get_object_store

    store = get_object_store()
    await store.put("icons/foo.png", data)
"""

from __future__ import annotations

from app.shared.config.config import settings
from app.shared.storage.domain.base_contract import ObjectStore, StorageError
from app.shared.storage.infrastructure.local_client import LocalFileStore
from app.shared.storage.infrastructure.s3_client import S3Store


def get_object_store() -> ObjectStore:
    """Return the configured :class:`ObjectStore` implementation.

    Reads ``OBJECT_STORE_TYPE`` from settings. Supports ``"local"`` and ``"s3"``.
    """
    store_type = settings.OBJECT_STORE_TYPE
    if store_type == "local":
        return LocalFileStore(
            base_path=settings.STORAGE_BASE_PATH,
            base_url=settings.STORAGE_BASE_URL,
        )
    if store_type == "s3":
        return S3Store(
            endpoint_url=settings.OBJECT_STORE_S3_ENDPOINT or None,
            access_key=settings.OBJECT_STORE_S3_ACCESS_KEY,
            secret_key=settings.OBJECT_STORE_S3_SECRET_KEY,
            bucket=settings.OBJECT_STORE_S3_BUCKET,
            region_name=settings.OBJECT_STORE_S3_REGION,
            url_expires=settings.OBJECT_STORE_S3_URL_EXPIRES,
        )
    raise StorageError(f"Unknown OBJECT_STORE_TYPE: {store_type}")
