"""FastAPI router for application email endpoints (gjo_se_com)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.infrastructure import application_mail_client
from app.application.schemas.email_schemas import (
    EmailResponse,
    TestEmailRequest,
)
from app.application.services import email_service
from app.shared.db_access.session import get_gjo_se_db
from app.shared.ports.project import ProjectCatalogPort, get_project_catalog_port
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


@router.post(
    "/test-application",
    response_model=EmailResponse,
    summary="Send a test application email",
)
async def test_application_email(
    _: AdminUser,
    body: TestEmailRequest,
    db: AsyncSession = Depends(get_gjo_se_db),
    catalog: ProjectCatalogPort = Depends(get_project_catalog_port),
) -> EmailResponse:
    """Sends a test application email via the MJML pipeline.

    In development, the email is captured by Mailpit (http://localhost:8025).
    """
    try:
        context = await application_mail_client.build_application_mail_context(
            db,
            catalog=catalog,
            project_id=body.project_id,
            recipient_name=body.to_name,
        )
        profile_email = context.get("profile_email")
        result = await email_service.send_application_email(
            recipient=body.to_email,
            context=context,
            from_override=profile_email if isinstance(profile_email, str) else None,
            bcc=[profile_email] if isinstance(profile_email, str) else None,
            pdf_paths=body.pdf_paths,
        )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return EmailResponse(**result)
