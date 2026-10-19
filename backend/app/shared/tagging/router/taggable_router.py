"""FastAPI router for Taggable assignment endpoints (gjo_se_com).

Admin (mounted under /api/v1/admin/tagging via router.py):
    GET    /taggable/{taggable_type}/{taggable_id}   – Get tags for entity
    PUT    /taggable/{taggable_type}/{taggable_id}   – Set tags for entity
    GET    /tags/{tag_id}/usage                      – Tag usage summary

The tag CRUD endpoints live in :mod:`tag_router`.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser
from app.shared.tagging.schemas.taggable_schemas import TaggableAssignIn, TaggableOut, TagUsageSummaryOut
from app.shared.tagging.services import taggable_service

router = APIRouter(prefix="/tagging", tags=["tagging · tags · admin"])


@router.get(
    "/tags/{tag_id}/usage",
    response_model=list[TagUsageSummaryOut],
    summary="Tag-Verwendung auflisten (Admin)",
)
async def get_tag_usage(
    tag_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[TagUsageSummaryOut]:
    """Returns taggable_type and count for each entity type using this tag."""
    usage = await taggable_service.get_tag_usage(db, tag_id)
    return [TagUsageSummaryOut(taggable_type=t, count=c) for t, c in usage]


@router.get(
    "/taggable/{taggable_type}/{taggable_id}",
    response_model=list[TaggableOut],
    summary="Tags einer Entität lesen (Admin)",
)
async def get_taggable_tags(
    taggable_type: str,
    taggable_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[TaggableOut]:
    """Returns all tag assignments with metadata for the given entity."""
    assignments = await taggable_service.get_tags(db, taggable_type, taggable_id)
    return [
        TaggableOut(
            tag_id=a.tag_id,
            taggable_type=a.taggable_type,
            taggable_id=a.taggable_id,
            tag_name=a.tag.name,
            tag_category=a.tag.category,
            tag_color_token=a.tag.color_token,
        )
        for a in assignments
    ]


@router.put(
    "/taggable/{taggable_type}/{taggable_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Tags einer Entität setzen (Admin)",
)
async def set_taggable_tags(
    taggable_type: str,
    taggable_id: int,
    body: TaggableAssignIn,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> None:
    """Replaces all tag assignments for the entity. Fails with 400 on invalid tag_ids or out-of-scope tags."""
    await taggable_service.set_tags(db, taggable_type, taggable_id, body.tag_ids)
    await db.commit()
