"""FastAPI router for FBF skill-group endpoints (gjo_se_com).

Public (mounted unter /api/v1/public/fbf via router.py):
    GET /skill-group – List curated skill groups (public)

Admin (mounted unter /api/v1/admin/fbf via router.py):
    GET    /skill-group            – List curated skill groups with full labels (Admin)
    POST   /skill-group            – Create skill group
    PUT    /skill-group/{id}       – Update skill group
    DELETE /skill-group/{id}       – Delete skill group (409 if referenced)
    POST   /skill-group/reorder    – Reorder skill groups
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.schemas.skill_schemas import (
    SkillGroupAdminOut,
    SkillGroupCreate,
    SkillGroupOut,
    SkillGroupReorderRequest,
    SkillGroupUpdate,
)
from app.fbf.services import skill_group_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

public_router = APIRouter()
admin_router = APIRouter()


# ── Public ────────────────────────────────────────────────────────────────────


@public_router.get(
    "/skill-group",
    response_model=list[SkillGroupOut],
    summary="List curated skill groups (public)",
)
async def list_public_skill_groups(
    db: AsyncSession = Depends(get_gjo_se_db),
    locale: str = Query(default="de", description="Requested locale (de/en, falls back to de)"),
) -> list[SkillGroupOut]:
    """Liefert alle kuratierten Skill-Gruppen geordnet nach ``sort`` ASC.

    Jede Gruppe traegt ``id``, ``sort``, ``priority`` und den lokalisierten
    ``label`` (Locale-Pick mit ``de``-Fallback). Das FE baut daraus das
    Skills-Grid (A4) – Reihenfolge, Name und Prioritaet kommen vollstaendig
    aus der DB.
    """
    return await skill_group_service.list_public_groups(db, locale)


# ── Admin ─────────────────────────────────────────────────────────────────────


@admin_router.get(
    "/skill-group",
    response_model=list[SkillGroupAdminOut],
    summary="List curated skill groups with full labels (Admin)",
)
async def list_skill_groups(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[SkillGroupAdminOut]:
    """Liefert alle Skill-Gruppen geordnet nach ``sort`` ASC.

    Anders als der Public-Endpoint traegt jede Gruppe die vollstaendigen
    DE/EN-``labels`` (kein Locale-Pick) – der Admin editiert jede Sprache
    einzeln.
    """
    return await skill_group_service.list_admin_groups(db)


@admin_router.put(
    "/skill-group/{group_id}",
    response_model=SkillGroupAdminOut,
    summary="Update a skill group (Admin)",
)
async def update_skill_group(
    group_id: int,
    body: SkillGroupUpdate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> SkillGroupAdminOut:
    """Aktualisiert ``sort``/``priority``/``labels`` einer Skill-Gruppe.

    Unbekannte ``group_id`` → 404.
    """
    group = await skill_group_service.update_group(db, group_id, body)
    await db.commit()
    return group


@admin_router.post(
    "/skill-group/reorder",
    response_model=int,
    summary="Reorder skill groups (Admin)",
)
async def reorder_skill_groups(
    body: SkillGroupReorderRequest,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> int:
    """Setzt ``sort`` aus ``ordered_ids`` (Index = sort) und liefert die Anzahl."""
    count = await skill_group_service.reorder_groups(db, body)
    await db.commit()
    return count


@admin_router.delete(
    "/skill-group/{group_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a skill group (Admin)",
)
async def delete_skill_group(
    group_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> None:
    """Loescht eine Skill-Gruppe samt Uebersetzungen.

    Unbekannte ``group_id`` → 404; noch zugeordnete Skills → 409.
    """
    await skill_group_service.delete_group_guarded(db, group_id)


@admin_router.post(
    "/skill-group",
    response_model=SkillGroupAdminOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a skill group (Admin)",
)
async def create_skill_group(
    body: SkillGroupCreate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> SkillGroupAdminOut:
    """Legt eine neue Skill-Gruppe ans Ende der Reihenfolge an (``sort`` = max+1)."""
    group = await skill_group_service.create_group(db, body)
    await db.commit()
    return group
