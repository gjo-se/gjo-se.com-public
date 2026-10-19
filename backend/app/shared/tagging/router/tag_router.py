"""FastAPI router for Tag CRUD endpoints (gjo_se_com).

Admin (mounted under /api/v1/admin/tagging via router.py):
    GET    /tags                        – List all tags
    POST   /tags                        – Create tag
    PATCH  /tags/{tag_id}               – Update tag
    DELETE /tags/{tag_id}               – Delete tag
    GET    /taggable-types              – Registered taggable entity types

The taggable assignment endpoints live in :mod:`taggable_router`.
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser
from app.shared.tagging.domain.tagging_rules import TaggableType
from app.shared.tagging.schemas.tag_schemas import TagCreate, TagOut, TagUpdate
from app.shared.tagging.services import tag_service

router = APIRouter(prefix="/tagging", tags=["tagging · tags · admin"])


@router.get(
    "/tags",
    response_model=list[TagOut],
    summary="Alle Tags auflisten (Admin)",
)
async def list_tags(
    _: AdminUser,
    category: str | None = Query(default=None),
    taggable_type: str | None = Query(default=None),
    slug: str | None = Query(default=None),
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[TagOut]:
    """Returns all tags sorted by category, sort_order, name.

    Filters:
    - ``category``: exact match on Tag.category.
    - ``slug``: exact match on Tag.slug.
    - ``taggable_type``: scope filter – only tags whose scope includes this type.
    """
    tag_tuples = await tag_service.list_tags(
        db,
        category=category,
        taggable_type=taggable_type,
        slug=slug,
    )
    return [TagOut.model_validate(t).model_copy(update={"usage_count": count}) for t, count in tag_tuples]


@router.post(
    "/tags",
    response_model=TagOut,
    status_code=status.HTTP_201_CREATED,
    summary="Tag anlegen (Admin)",
)
async def create_tag(
    body: TagCreate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> TagOut:
    """Creates a new tag. Fails with 400 on invalid color_token, 409 on duplicate (name, category)."""
    tag = await tag_service.create_tag(db, **body.model_dump())
    await db.commit()
    return TagOut.model_validate(tag)


@router.patch(
    "/tags/{tag_id}",
    response_model=TagOut,
    summary="Tag bearbeiten (Admin)",
)
async def update_tag(
    tag_id: int,
    body: TagUpdate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> TagOut:
    """Partially updates a tag. Only non-None fields are applied."""
    tag = await tag_service.update_tag(db, tag_id=tag_id, **body.model_dump())
    await db.commit()
    return TagOut.model_validate(tag)


@router.delete(
    "/tags/{tag_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Tag löschen (Admin)",
)
async def delete_tag(
    tag_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> None:
    """Deletes a tag. Fails with 404 if not found, 409 if still in use."""
    await tag_service.delete_tag(db, tag_id)
    await db.commit()


@router.get(
    "/taggable-types",
    response_model=list[str],
    summary="Registrierte taggable Entity-Typen (Admin)",
)
async def list_taggable_types() -> list[str]:
    """Returns all registered taggable entity types for the scope combobox."""
    return [t.value for t in TaggableType]
