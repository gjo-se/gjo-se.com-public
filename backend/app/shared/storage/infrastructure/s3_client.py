"""S3Store – S3/MinIO-backed ObjectStore implementation via boto3.

Stores objects in an S3-compatible bucket (MinIO in dev, any S3 in prod).
Public URLs are presigned with a configurable expiry (default 1h).
"""

from __future__ import annotations

import mimetypes
from typing import override

import boto3
import structlog
from botocore.client import BaseClient
from botocore.exceptions import ClientError

from app.shared.storage.domain.base_contract import (
    ObjectInfo,
    ObjectNotFoundError,
    ObjectStore,
    StorageError,
)

logger = structlog.get_logger(__name__)

_HTTP_NOT_FOUND = 404


class S3Store(ObjectStore):
    """ObjectStore implementation backed by S3 / MinIO via boto3.

    Args:
        endpoint_url: S3-compatible endpoint (e.g. ``http://minio:9000``). Empty
            (None) falls back to the regional AWS endpoint (IAM-Task-Role).
        access_key: AWS access key ID (MinIO root user). Optional.
        secret_key: AWS secret access key (MinIO root password). Optional.
        bucket: Target bucket name.
        region_name: AWS region name (default ``eu-central-1``).
        url_expires: Presigned URL validity in seconds (default 3600).
    """

    def __init__(
        self,
        endpoint_url: str | None = None,
        access_key: str | None = None,
        secret_key: str | None = None,
        bucket: str = "gjose-assets",
        region_name: str | None = None,
        url_expires: int = 3600,
    ) -> None:
        self._bucket = bucket
        self._url_expires = url_expires
        client_kwargs: dict[str, str] = {}
        if endpoint_url:
            client_kwargs["endpoint_url"] = endpoint_url  # MinIO/dev
        if access_key and secret_key:
            client_kwargs["aws_access_key_id"] = access_key  # MinIO/dev
            client_kwargs["aws_secret_access_key"] = secret_key
        client_kwargs["region_name"] = region_name or "eu-central-1"
        self._client: BaseClient = boto3.client("s3", **client_kwargs)
        logger.info(
            "S3Store initialized",
            endpoint=endpoint_url,
            bucket=bucket,
            url_expires=url_expires,
        )

    @staticmethod
    def _content_type_for(key: str) -> str:
        """Media type from the key's extension.

        Without an explicit ``ContentType`` S3 stores ``binary/octet-stream``,
        which is then delivered verbatim by the Asset-CloudFront (the browser
        receives an octet-stream instead of ``image/jpeg``). Falls back to
        ``application/octet-stream`` for unknown/extension-less keys.
        """
        guessed, _ = mimetypes.guess_type(key)
        return guessed or "application/octet-stream"

    @override
    async def put(self, key: str, data: bytes, *, metadata: dict[str, str] | None = None) -> str:
        """Upload ``data`` to ``key`` in the configured bucket."""
        try:
            self._client.put_object(
                Bucket=self._bucket,
                Key=key,
                Body=data,
                Metadata=metadata or {},
                ContentType=self._content_type_for(key),
            )
        except ClientError:
            logger.exception("Failed to put object %s", key)
            raise StorageError(f"Failed to put object: {key}") from None
        logger.info("Object stored", key=key, size=len(data))
        return key

    @override
    async def get(self, key: str) -> bytes:
        """Read the raw bytes of the object stored under ``key``.

        Raises:
            ObjectNotFoundError: If the key does not exist.
            StorageError: On any other S3 error.
        """
        try:
            response = self._client.get_object(Bucket=self._bucket, Key=key)
            data: bytes = response["Body"].read()
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code")
            status = exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
            if code in {"NoSuchKey", "404"} or status == _HTTP_NOT_FOUND:
                logger.warning("Object not found: %s", key)
                raise ObjectNotFoundError(f"Object not found: {key}") from None
            logger.exception("Failed to get object %s", key)
            raise StorageError(f"Failed to get object: {key}") from None
        logger.info("Object read", key=key, size=len(data))
        return data

    @override
    async def get_url(self, key: str) -> str:
        """Generate a presigned GET URL for ``key``.

        The URL is valid for ``url_expires`` seconds (default 3600).
        If ``public_endpoint_url`` is set, the hostname is replaced so
        the URL is browser-accessible (e.g. ``localhost:9000`` instead
        of internal ``minio:9000``).
        """
        try:
            url = self._client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self._bucket, "Key": key},
                ExpiresIn=self._url_expires,
            )
        except ClientError:
            logger.exception("Failed to generate presigned URL for %s", key)
            raise StorageError(f"Failed to generate presigned URL: {key}") from None
        return url

    @override
    async def list(self, prefix: str) -> list[ObjectInfo]:
        """List all objects under ``prefix`` with their metadata.

        ``key`` and ``createdAt`` come from the listing itself; the original
        filename requires one ``head_object`` per key (N+1, acceptable for
        admin-picker-sized listings). Objects without a ``filename`` metadata
        (legacy assets) fall back to ``name = key``.
        """
        try:
            response = self._client.list_objects_v2(Bucket=self._bucket, Prefix=prefix)
        except ClientError:
            logger.exception("Failed to list prefix %s", prefix)
            raise StorageError(f"Failed to list prefix: {prefix}") from None
        objects: list[ObjectInfo] = []
        for obj in response.get("Contents", []):
            key = obj["Key"]
            objects.append(
                ObjectInfo(
                    key=key,
                    name=self._head_filename(key),
                    createdAt=obj["LastModified"],
                )
            )
        return sorted(objects, key=lambda info: info.key)

    def _head_filename(self, key: str) -> str:
        """Return the stored original filename for ``key``, or the key itself.

        Reads the S3 user metadata (``x-amz-meta-filename``) via a HEAD
        request. Any error or missing metadata degrades gracefully to the
        key so legacy assets keep listing without a break.
        """
        try:
            head = self._client.head_object(Bucket=self._bucket, Key=key)
        except ClientError:
            logger.warning("Failed to read metadata for %s – falling back to key", key)
            return key
        return head.get("Metadata", {}).get("filename") or key

    @override
    async def exists(self, key: str) -> bool:
        """Return whether the object exists in the bucket (HEAD request)."""
        try:
            self._client.head_object(Bucket=self._bucket, Key=key)
        except ClientError:
            return False
        return True

    @override
    async def delete(self, key: str) -> None:
        """Delete ``key`` from the bucket.

        Raises:
            ObjectNotFoundError: If the key does not exist.
        """
        try:
            self._client.head_object(Bucket=self._bucket, Key=key)
        except ClientError as exc:
            status = exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
            if status == _HTTP_NOT_FOUND:
                logger.warning("Delete failed – object not found: %s", key)
                raise ObjectNotFoundError(f"Object not found: {key}") from None
            logger.exception("Failed to check object existence for %s", key)
            raise StorageError(f"Failed to delete object: {key}") from None
        try:
            self._client.delete_object(Bucket=self._bucket, Key=key)
        except ClientError:
            logger.exception("Failed to delete object %s", key)
            raise StorageError(f"Failed to delete object: {key}") from None
        logger.info("Object deleted", key=key)
