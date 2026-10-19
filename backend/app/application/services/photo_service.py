"""Business logic for uploading the profile photo (gjo_se_com).

Validates the uploaded image (content type + size), persists it in the object
store under the fixed key ``profile/photo.{ext}`` (singleton profile – one
portrait, the previous file gets overwritten) and stores the key in
``application_profile.photo_url`` via the repository.
"""

import structlog
from fastapi import UploadFile

from app.application.exceptions import ProfileNotFoundError
from app.application.repositories import profile_repository
from app.shared.db_access.session_types import AsyncSession
from app.shared.storage.exceptions import ImageTooLargeError, InvalidImageTypeError
from app.shared.storage.infrastructure.factory_client import get_object_store

# structlog (not stdlib logging) so keyword arguments render as structured
# fields – ``logging.getLogger`` raises TypeError on ``key=`` kwargs.
logger = structlog.get_logger(__name__)

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB

# content_type → file extension used in the generated storage key.
ALLOWED_IMAGE_TYPES: dict[str, str] = {
    "image/svg+xml": ".svg",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}


async def upload_profile_photo(db: AsyncSession, file: UploadFile) -> str:
    """Validates and uploads the profile photo, then stores its key in the DB.

    The file is persisted in the object store under the fixed key
    ``profile/photo.{ext}`` (extension derived from the validated content type;
    no id in the key – the singleton profile has exactly one portrait and
    re-uploads overwrite the previous file) and ``photo_url`` of the profile row
    is updated.

    Args:
        db: Active async DB session.
        file: The multipart-uploaded image file.

    Returns:
        The storage key under which the image was saved.

    Raises:
        ProfileNotFoundError: If no application profile exists yet.
        InvalidImageTypeError: If the content type is not SVG/PNG/JPEG/WebP.
        ImageTooLargeError: If the file exceeds 5 MB.
    """
    profile = await profile_repository.get_profile(db)
    if profile is None:
        logger.warning("application profile not found")
        raise ProfileNotFoundError("Kein Application Profile gefunden. Bitte zuerst via PUT anlegen.")

    extension = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
    if extension is None:
        logger.warning("unsupported image content type: %s", file.content_type)
        raise InvalidImageTypeError(
            f"Nicht unterstützter Content-Type '{file.content_type}' – erlaubt sind SVG, PNG, JPEG und WebP"
        )

    data = await file.read()
    if len(data) > MAX_IMAGE_SIZE:
        logger.warning("profile photo too large: size=%s", len(data))
        raise ImageTooLargeError("Bild darf maximal 5 MB groß sein")

    key = f"profile/photo{extension}"
    await get_object_store().put(key, data)
    await profile_repository.set_photo_url(db, profile.id, key)
    await db.commit()
    logger.info("profile photo uploaded", key=key)
    return key
