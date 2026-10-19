"""FastAPI router for FBF skill endpoints (gjo_se_com).

Skill-group endpoints live in :mod:`app.fbf.router.skill_group_router`.

Public (mounted unter /api/v1/public/fbf via router.py):
    GET /skill       – List public skills (tag site:public, importance DESC)
    GET /projects/{id}/skills – Public skills of a project (Proof-Daten)
Admin (mounted unter /api/v1/admin/fbf via router.py):
    GET    /skill              – List paginated skills (status filter)
    GET    /skill/count        – Count skills
    GET    /skill/{id}         – Retrieve a single skill (incl. internal level)
    POST   /skill              – Create skill
    PUT    /skill/{id}         – Update skill
    DELETE /skill/{id}         – Delete skill (409 if referenced)
    POST   /skill/confirm      – Batch: pending → confirmed
    POST   /skill/{id}/reassign – Repoint project links to another skill / drop
    POST   /skill/{id}/reject   – Reject pending skill: repoint + delete
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.repositories.skill_repository import SkillFilter
from app.fbf.schemas.project_skill_schemas import ProjectSkillPublicOut
from app.fbf.schemas.skill_schemas import (
    SkillAdminOut,
    SkillConfirmRequest,
    SkillCreate,
    SkillOut,
    SkillPublicOut,
    SkillReorderRequest,
    SkillUpdate,
)
from app.fbf.services import skill_public_service, skill_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.security.dependencies.auth_dependencies import AdminUser

public_router = APIRouter()
admin_router = APIRouter()


# ── Public ────────────────────────────────────────────────────────────────────


@public_router.get(
    "/skill",
    response_model=list[SkillPublicOut],
    summary="List public skills (site:public)",
)
async def list_public_skills(
    db: AsyncSession = Depends(get_gjo_se_db),
    group_id: int | None = Query(default=None, description="Filter by skill group id"),
    limit: int | None = Query(default=None, ge=1, le=500, description="Max items (default: all)"),
    grouped_only: bool = Query(default=False, description="Only skills assigned to a group"),
) -> list[SkillPublicOut]:
    """Public skills (tag ``site:public``) sorted by ``importance`` DESC.

    ``grouped_only=true`` liefert nur gruppierte Skills – die Public-Seiten
    rendern ausschließlich diese (die ungruppierten Katalog-Skills sind reine
    Payload: 89 % der Items, aber 0 % der Darstellung).
    """
    skills_with_avg = await skill_public_service.list_public_skills(
        db,
        group_id=group_id,
        limit=limit,
        grouped_only=grouped_only,
    )
    blended = [
        (
            skill,
            skill_service.effective_importance(skill, None, avg_importance),
        )
        for skill, avg_importance in skills_with_avg
    ]
    blended.sort(
        key=lambda item: (
            item[0].group_id is None,
            item[0].group_id if item[0].group_id is not None else 0,
            item[0].sort is None,
            item[0].sort if item[0].sort is not None else 0,
            -item[1],
            item[0].name,
        )
    )
    return [
        SkillPublicOut.model_validate(skill).model_copy(
            update={"importance": importance},
        )
        for skill, importance in blended
    ]


@public_router.get(
    "/projects/{project_id}/skills",
    response_model=list[ProjectSkillPublicOut],
    summary="Public skills of a project (Proof-Daten)",
)
async def get_project_skills_public(
    project_id: int,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> list[ProjectSkillPublicOut]:
    """Liefert die Skills einer Ausschreibung für die Proof-Match-Sektion.

    Nur Skill-Felder (name, importance, level_public) – keine Projekt-Metadaten.
    Projekt-ID unbekannt → 404. Die Importance ist der EINZIGE geblendete Wert
    (``effective_importance`` – identisch zum Admin/AIScope-Pfad), damit das
    FE exakt die Werte erhält, die auch das Projekt-Detail zeigt.
    """
    result = await skill_public_service.get_project_public_skills(db, project_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    blended = [
        (skill, skill_service.effective_importance(skill, project_imp, avg_imp))
        for skill, project_imp, avg_imp in result
    ]
    blended.sort(key=lambda item: item[1], reverse=True)
    return [
        ProjectSkillPublicOut(
            name=skill.name,
            importance=importance,
            level_public=skill.level_public,
        )
        for skill, importance in blended
    ]


# ── Admin ─────────────────────────────────────────────────────────────────────


@admin_router.post(
    "/skill/reorder",
    response_model=int,
    summary="Reorder skills within a group (Admin)",
)
async def reorder_skills(
    body: SkillReorderRequest,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> int:
    """Setzt ``sort`` gruppenrelativ aus ``ordered_ids`` und liefert die Anzahl."""
    count = await skill_service.reorder_skills(db, body)
    await db.commit()
    return count


@admin_router.get(
    "/skill",
    response_model=list[SkillAdminOut],
    summary="List paginated skills (Admin)",
)
async def list_skills(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    q: str | None = Query(default=None, description="Search term for name"),
    status_filter: str | None = Query(default=None, alias="status", description="Curation status filter"),
    tag: str | None = Query(default=None, description="Filter by tag name"),
    master_filter: str | None = Query(default=None, description="Filter: masters (skills with slaves) or slaves"),
    min_importance: float | None = Query(default=None, ge=0, le=5, description="Min importance (0-5)"),
    min_level: float | None = Query(default=None, ge=0, le=5, description="Min level (0-5)"),
    min_level_public: float | None = Query(default=None, ge=0, le=5, description="Min level public (0-5)"),
    min_avg_project_importance: float | None = Query(
        default=None, ge=0, le=5, description="Min avg project importance (0-5)"
    ),
    group_id: int | None = Query(default=None, description="Filter by skill group id"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=5000),
    sort_by: str = Query(
        default="name",
        description="Sort field: name, importance, level, level_public, status, project_count, avg_project_importance",
    ),
    sort_order: str = Query(default="asc", pattern="^(asc|desc)$", description="Sort direction"),
) -> list[SkillAdminOut]:
    """Returns paginated skills (incl. internal ``level`` + project usage count) with search / filter / sort."""
    skills_with_counts = await skill_service.list_paginated_with_counts(
        db,
        filters=SkillFilter(
            q=q,
            status=status_filter,
            tag=tag,
            master_filter=master_filter,
            min_importance=min_importance,
            min_level=min_level,
            min_level_public=min_level_public,
            min_avg_project_importance=min_avg_project_importance,
            group_id=group_id,
        ),
        offset=offset,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    # Build canonical name lookup for master_name resolution
    all_ids = {skill.id for skill, *_ in skills_with_counts}
    canonical_ids = {skill.canonical_id for skill, *_ in skills_with_counts if skill.canonical_id is not None}
    needed_ids = all_ids | canonical_ids
    all_skills_map = {s.id: s for s in await skill_service.get_skills_by_ids(db, list(needed_ids))}

    # Total project count (for percentage) – only master projects
    from sqlalchemy import func, select

    from app.fbf.models.project import Project

    total_projects: int = (
        await db.execute(select(func.count()).select_from(Project).where(Project.canonical_id.is_(None)))
    ).scalar_one()

    return [
        SkillAdminOut.model_validate(skill).model_copy(
            update={
                "project_count": count,
                "project_percentage": round(count / total_projects * 100, 1) if total_projects > 0 else None,
                "avg_project_importance": round(avg_imp, 1) if avg_imp is not None else None,
                "master_name": all_skills_map[skill.canonical_id].name if skill.canonical_id else None,
                "status": status_name,
                "status_color_token": status_color,
            },
        )
        for skill, count, avg_imp, status_name, status_color in skills_with_counts
    ]


@admin_router.get(
    "/skill/count",
    summary="Count skills (Admin)",
)
async def count_skills(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    q: str | None = Query(default=None, description="Search term"),
    status_filter: str | None = Query(default=None, alias="status", description="Curation status filter"),
    tag: str | None = Query(default=None, description="Filter by tag name"),
    master_filter: str | None = Query(default=None, description="Filter: masters or slaves"),
    min_importance: float | None = Query(default=None, ge=0, le=5, description="Min importance (0-5)"),
    min_level: float | None = Query(default=None, ge=0, le=5, description="Min level (0-5)"),
    min_level_public: float | None = Query(default=None, ge=0, le=5, description="Min level public (0-5)"),
    min_avg_project_importance: float | None = Query(
        default=None, ge=0, le=5, description="Min avg project importance (0-5)"
    ),
    group_id: int | None = Query(default=None, description="Filter by skill group id"),
) -> int:
    """Returns filtered count."""
    return await skill_service.count_filtered(
        db,
        SkillFilter(
            q=q,
            status=status_filter,
            tag=tag,
            master_filter=master_filter,
            min_importance=min_importance,
            min_level=min_level,
            min_level_public=min_level_public,
            min_avg_project_importance=min_avg_project_importance,
            group_id=group_id,
        ),
    )


@admin_router.post(
    "/skill/confirm",
    summary="Batch-confirm pending skills (Admin)",
)
async def confirm_skills(
    body: SkillConfirmRequest,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> int:
    """Set the given pending skills to ``confirmed``. Returns the count changed."""
    confirmed = await skill_service.confirm_skills(db, body.ids)
    await db.commit()
    return confirmed


@admin_router.get(
    "/skill/{skill_id}",
    response_model=SkillAdminOut,
    summary="Retrieve a single skill (Admin)",
)
async def get_skill(
    skill_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> SkillAdminOut:
    """Returns a single skill including the internal ``level`` for editing."""
    skill = await skill_service.get_skill_by_id(db, skill_id)
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    return SkillAdminOut.model_validate(skill)


@admin_router.post(
    "/skill",
    response_model=SkillOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a skill",
)
async def create_skill(
    body: SkillCreate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> SkillOut:
    """Create a new skill. Requires admin access."""
    created = await skill_service.create_skill(db, body)
    await db.commit()
    return SkillOut.model_validate(created)


@admin_router.put(
    "/skill/{skill_id}",
    response_model=SkillAdminOut,
    summary="Update a skill",
)
async def update_skill(
    skill_id: int,
    body: SkillUpdate,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> SkillAdminOut:
    """Update an existing skill by ID. Requires admin access."""
    updated = await skill_service.update_skill(db, skill_id, body)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    await db.commit()
    return SkillAdminOut.model_validate(updated)


@admin_router.delete(
    "/skill/{skill_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a skill",
)
async def delete_skill(
    skill_id: int,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> None:
    """Delete a skill by ID. Fails with 409 if still referenced by projects."""
    await skill_service.delete_guarded(db, skill_id)
