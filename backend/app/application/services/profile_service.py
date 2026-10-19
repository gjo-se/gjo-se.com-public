"""Business logic for the singleton application profile (gjo_se_com).

Enforces the singleton pattern: only one profile may exist. The service
orchestrates over ``ProfileOut`` DTOs; every SQLAlchemy/ORM concern lives in
``profile_repository`` (Achse 2: ``services`` > ``repositories``).
"""

from collections.abc import Mapping

from app.application.exceptions import ProfileNotFoundError
from app.application.repositories import profile_repository
from app.application.schemas.profile_schemas import (
    ProfileLocaleFieldsOut,
    ProfileOut,
    ProfileUpdate,
)
from app.shared.db_access.session_types import AsyncSession

ALLOWED_LOCALES = {"de", "en"}


def _validate_locales(translations: Mapping[str, ProfileLocaleFieldsOut]) -> None:
    """Raises a ValueError when a locale outside {de, en} is provided.

    Args:
        translations: Locale → localized fields mapping from the payload.

    Raises:
        ValueError: If any locale is not in {de, en}.
    """
    invalid = set(translations.keys()) - ALLOWED_LOCALES
    if invalid:
        raise ValueError(f"Ungültige Locale(s): {', '.join(sorted(invalid))} – erlaubt sind de, en")


async def upsert_profile(db: AsyncSession, data: ProfileUpdate) -> ProfileOut:
    """Creates the singleton profile if none exists, otherwise updates it.

    When ``translations`` is provided, the existing translation rows are
    replaced (translation-table pattern).

    Args:
        db: Active async DB session.
        data: Validated upsert payload.

    Returns:
        The created or updated profile as DTO.

    Raises:
        ValueError: If a locale outside {de, en} is provided.
        ProfileNotFoundError: If an existing profile vanished mid-update.
    """
    if data.translations is not None:
        _validate_locales(data.translations)
    if await profile_repository.get_profile(db) is None:
        return await profile_repository.create_profile(db, data)
    updated = await profile_repository.update_profile(db, data)
    if updated is None:
        raise ProfileNotFoundError("Kein Application Profile zum Aktualisieren gefunden.")
    return updated
