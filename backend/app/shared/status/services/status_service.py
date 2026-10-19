"""Business logic for Status and Statusable (gjo_se_com).

Orchestrates over ``StatusRecord``/``StatusableRecord`` DTOs; every
SQLAlchemy/ORM concern lives in ``status_repository``/``statusable_repository``
(Achse 2: ``services`` > ``repositories``).
"""

import logging

from fastapi import HTTPException, status

from app.shared.db_access.service_helpers import resolve_unique_slug
from app.shared.db_access.session_types import AsyncSession
from app.shared.status.domain.status_contract import StatusableRecord, StatusRecord
from app.shared.status.repositories import status_repository, statusable_repository
from app.shared.tagging.domain.tagging_rules import ColorToken

logger = logging.getLogger(__name__)


async def list_statuses(
    db: AsyncSession,
    category: str | None = None,
    statusable_type: str | None = None,
    slug: str | None = None,
) -> list[tuple[StatusRecord, int]]:
    """Return all statuses with their usage count, optionally filtered by category, slug and/or statusable_type."""
    statuses = await status_repository.list_records(db, category=category, statusable_type=statusable_type, slug=slug)
    result: list[tuple[StatusRecord, int]] = []
    for s in statuses:
        count = await statusable_repository.get_usage_count(db, s.id)
        result.append((s, count))
    return result


def _validate_color_token(color_token: str, *, context: str) -> None:
    """Validate a colour token, raising HTTP 400 for unknown tokens.

    Args:
        color_token: The token value to validate.
        context: Short context label for the warning log.

    Raises:
        HTTPException 400: The token is not a known ``ColorToken``.
    """
    try:
        _ = ColorToken(color_token)
    except ValueError:
        logger.warning("Invalid color_token '%s' for %s", color_token, context, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ungültiges Color-Token: '{color_token}'.",
        ) from None


async def create_status(
    db: AsyncSession,
    name: str,
    category: str,
    color_token: str,
    description: str | None,
    sort_order: float,
    scope: list[str] | None = None,
    slug: str | None = None,
) -> StatusRecord:
    """Create a new status, failing with 400/409 on invalid input.

    When *slug* is empty it is auto-generated from ``category-name``.

    Raises:
        HTTPException 400: Invalid color_token.
        HTTPException 409: Duplicate name + category combination or duplicate slug.
    """
    _validate_color_token(color_token, context=f"status '{name}' / '{category}'")

    existing = await status_repository.get_record_by_name_and_category(db, name, category)
    if existing is not None:
        logger.warning(
            "Duplicate status name='%s' category='%s' (existing id=%s)",
            name,
            category,
            existing.id,
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ein Status mit Name '{name}' existiert bereits in Kategorie '{category}'.",
        )

    resolved_slug = await resolve_unique_slug(
        status_repository.slug_exists,
        db,
        name=name,
        category=category,
        slug=slug,
        label="Status",
    )

    return await status_repository.create_record(
        db,
        name=name,
        slug=resolved_slug,
        category=category,
        color_token=color_token,
        description=description,
        sort_order=sort_order,
        scope=scope,
    )


async def update_status(
    db: AsyncSession,
    status_id: int,
    name: str | None,
    category: str | None,
    color_token: str | None,
    description: str | None,
    sort_order: float | None,
    scope: list[str] | None = None,
    slug: str | None = None,
) -> StatusRecord:
    """Partially update a status. Only non-None fields are applied.

    Raises:
        HTTPException 400: Invalid color_token.
        HTTPException 404: Status not found.
        HTTPException 409: Renamed status conflicts with existing (name, category) pair or duplicate slug.
    """
    current = await status_repository.get_record_by_id(db, status_id)
    if current is None:
        logger.warning("Status id=%s not found for update", status_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Status nicht gefunden.")

    resolved_name = name if name is not None else current.name
    resolved_category = category if category is not None else current.category

    if (name is not None and name != current.name) or (category is not None and category != current.category):
        existing = await status_repository.get_record_by_name_and_category(db, resolved_name, resolved_category)
        if existing is not None and existing.id != status_id:
            logger.warning(
                "Update status id=%s would conflict with existing id=%s (name='%s', category='%s')",
                status_id,
                existing.id,
                resolved_name,
                resolved_category,
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ein Status mit Name '{resolved_name}' existiert bereits in Kategorie '{resolved_category}'.",
            )

    changes: dict[str, object] = {}

    if slug is not None and slug != current.slug:
        if await status_repository.slug_exists(db, slug, exclude_id=status_id):
            logger.warning(
                "Update status id=%s would conflict with existing slug '%s'",
                status_id,
                slug,
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Slug '{slug}' ist bereits vergeben.",
            )
        changes["slug"] = slug

    if color_token is not None:
        _validate_color_token(color_token, context=f"status id={status_id}")
        changes["color_token"] = color_token

    if name is not None:
        changes["name"] = name
    if category is not None:
        changes["category"] = category
    if description is not None:
        changes["description"] = description
    if sort_order is not None:
        changes["sort_order"] = sort_order
    if scope is not None:
        changes["scope"] = scope

    updated = await status_repository.update_record(db, status_id, changes=changes)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Status nicht gefunden.")
    return updated


async def delete_status(db: AsyncSession, status_id: int) -> None:
    """Delete a status, failing with 409 if still referenced (RESTRICT).

    Raises:
        HTTPException 404: Status not found.
        HTTPException 409: Status has usage_count > 0.
    """
    current = await status_repository.get_record_by_id(db, status_id)
    if current is None:
        logger.warning("Status id=%s not found for delete", status_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Status nicht gefunden.")

    count = await statusable_repository.get_usage_count(db, status_id)
    if count > 0:
        logger.warning(
            "Cannot delete status id=%s – used by %s entities",
            status_id,
            count,
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Status wird von {count} Entitäten verwendet und kann nicht gelöscht werden (RESTRICT).",
        )

    await status_repository.delete_record(db, status_id)


async def assign_default_status(
    db: AsyncSession,
    statusable_type: str,
    statusable_id: int,
    default_name: str = "inactive",
) -> None:
    """Assign a default status to a newly created entity (Option A).

    Guarantees every statusable entity carries a real status from creation,
    so the UI never invents a display value that is absent from the DB.
    Resolves the status named *default_name* scoped to *statusable_type* and
    assigns it. No-op when the default status is not defined for that type
    (the caller is free to leave the entity statusless or set one later).
    """
    statuses = await status_repository.list_records(db, statusable_type=statusable_type)
    default = next((s for s in statuses if s.name == default_name), None)
    if default is None:
        logger.warning(
            "No default status '%s' for %s/%s – leaving statusless",
            default_name,
            statusable_type,
            statusable_id,
        )
        return
    await statusable_repository.set_status(db, statusable_type, statusable_id, default.id)


async def set_status(
    db: AsyncSession,
    statusable_type: str,
    statusable_id: int,
    status_id: int,
) -> None:
    """Assign a status to an entity, validating the status_id and scope.

    Raises:
        HTTPException 400: Invalid status_id (does not exist or out of scope).
    """
    status_obj = await status_repository.get_record_by_id(db, status_id)
    if status_obj is None:
        logger.warning(
            "Status id=%s not found for set_status (type='%s', entity=%s)",
            status_id,
            statusable_type,
            statusable_id,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Status mit ID {status_id} existiert nicht.",
        )
    if status_obj.scope is not None and statusable_type not in status_obj.scope:
        logger.warning(
            "Out-of-scope status id=%s for %s/%s",
            status_id,
            statusable_type,
            statusable_id,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Status ist nicht für '{statusable_type}' freigegeben.",
        )

    await statusable_repository.set_status(db, statusable_type, statusable_id, status_id)


async def get_status(db: AsyncSession, statusable_type: str, statusable_id: int) -> StatusableRecord | None:
    """Return the junction row with status metadata as a record, or None."""
    return await statusable_repository.get_status_record(db, statusable_type, statusable_id)


async def get_status_by_name_for_type(db: AsyncSession, name: str, statusable_type: str) -> StatusRecord | None:
    """Return the status named *name* scoped to *statusable_type*, or None.

    Thin service facade over ``status_repository.get_by_name_for_type`` so
    feature services resolve lifecycle statuses through the status service
    instead of reaching into the status repository directly.
    """
    return await status_repository.get_by_name_for_type(db, name, statusable_type)
