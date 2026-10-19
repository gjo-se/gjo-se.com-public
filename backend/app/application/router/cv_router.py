"""FastAPI router for application CV endpoints (gjo_se_com).

Admin-only test endpoint that renders the data-driven application CV for a
given project id and returns it as a PDF download.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.schemas.cv_schemas import CvPreviewRequest
from app.application.services import cv_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.ports.project import ProjectCatalogPort, get_project_catalog_port
from app.shared.ports.skill import SkillCatalogPort, get_skill_catalog_port
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


@router.get(
    "",
    response_class=Response,
    summary="Render the project-less application CV as PDF",
    responses={
        200: {
            "content": {"application/pdf": {}},
            "description": "CV rendered successfully",
        },
        404: {"description": "Profile not found"},
    },
)
async def general_cv(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    catalog: ProjectCatalogPort = Depends(get_project_catalog_port),
    skills: SkillCatalogPort = Depends(get_skill_catalog_port),
) -> Response:
    """Render the project-less CV (skills tagged ``site:promo``) as a PDF.

    Used to hand out the current CV without a project context (e.g. on request).
    """
    try:
        rendered = await cv_service.render_application_cv(db, catalog=catalog, skills=skills)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    return Response(
        content=rendered.pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{rendered.filename}"'},
    )


@router.post(
    "/preview",
    response_class=Response,
    summary="Render the application CV for a project as PDF",
    responses={
        200: {
            "content": {"application/pdf": {}},
            "description": "CV rendered successfully",
        },
        404: {"description": "Project/Profile not found"},
    },
)
async def preview_cv(
    _: AdminUser,
    body: CvPreviewRequest,
    db: AsyncSession = Depends(get_gjo_se_db),
    catalog: ProjectCatalogPort = Depends(get_project_catalog_port),
    skills: SkillCatalogPort = Depends(get_skill_catalog_port),
) -> Response:
    """Render the application CV for ``project_id`` and return it as a PDF."""
    try:
        rendered = await cv_service.render_application_cv(
            db,
            catalog=catalog,
            skills=skills,
            project_id=body.project_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    return Response(
        content=rendered.pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{rendered.filename}"'},
    )
