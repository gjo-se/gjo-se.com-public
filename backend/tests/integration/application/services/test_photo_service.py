"""Integration tests for the profile-photo service (real Postgres + local store)."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.models.profile import Profile
from app.application.services import photo_service
from app.shared.storage.exceptions import ImageTooLargeError, InvalidImageTypeError

pytestmark = pytest.mark.integration


class _FakeUpload:
    """Minimal duck-typed UploadFile for the content-type/size checks."""

    def __init__(self, data: bytes, content_type: str) -> None:
        """Store the payload and its declared content type."""
        self._data = data
        self.content_type = content_type

    async def read(self) -> bytes:
        """Return the whole uploaded payload."""
        return self._data


async def test_upload_rejects_unsupported_content_type(db_session: AsyncSession, app_profile: Profile) -> None:
    """A non-image content type is rejected before any write."""
    with pytest.raises(InvalidImageTypeError):
        await photo_service.upload_profile_photo(db_session, _FakeUpload(b"x", "application/pdf"))


async def test_upload_rejects_oversized_image(db_session: AsyncSession, app_profile: Profile) -> None:
    """A payload above the 5 MB limit is rejected."""
    too_large = b"x" * (photo_service.MAX_IMAGE_SIZE + 1)

    with pytest.raises(ImageTooLargeError):
        await photo_service.upload_profile_photo(db_session, _FakeUpload(too_large, "image/png"))


async def test_upload_stores_key_and_updates_profile(db_session: AsyncSession, app_profile: Profile) -> None:
    """A valid PNG is stored under the fixed key and linked on the profile."""
    key = await photo_service.upload_profile_photo(db_session, _FakeUpload(b"png-bytes", "image/png"))

    assert key == "profile/photo.png"
    assert app_profile.photo_url == "profile/photo.png"
