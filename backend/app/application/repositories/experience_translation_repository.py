"""Translation-table writes for application experience projects.

Extracted from ``experience_repository``: the translation replacement uses the
translation-table pattern (delete-then-recreate in one flush) and is cohesive on
its own.
"""

from collections.abc import Mapping
from typing import Any, Protocol

from sqlalchemy import delete as delete_stmt
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.models.experience import Experience
from app.application.models.experience_translation import ExperienceTranslation


class _LocaleFields(Protocol):
    """Structural type for a localized field set (pydantic model with ``model_dump``)."""

    def model_dump(self) -> dict[str, Any]:
        """Return the localized field set as a plain mapping."""
        ...


async def replace_translations(
    db: AsyncSession,
    experience: Experience,
    translations: Mapping[str, _LocaleFields],
) -> None:
    """Replaces all translation rows of *experience* with *translations*.

    Uses the translation-table pattern: existing rows are deleted and the new
    rows created in one flush. New rows are persisted via ``add_all`` with an
    explicit ``experience_id`` instead of assigning ``experience.translations``
    (the collection assignment would trigger a lazy-load and raise
    ``MissingGreenlet`` inside the async session).

    Args:
        db: Active async DB session.
        experience: Experience whose translations are replaced.
        translations: Mapping of locale → localized fields to persist.
    """
    _ = await db.execute(delete_stmt(ExperienceTranslation).where(ExperienceTranslation.experience_id == experience.id))
    db.add_all(
        ExperienceTranslation(
            experience_id=experience.id,
            locale=locale,
            **fields.model_dump(),
        )
        for locale, fields in translations.items()
    )
    await db.flush()
