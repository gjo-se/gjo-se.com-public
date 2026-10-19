"""FastAPI router for PDF generation endpoints (gjo_se_com).

Admin-only endpoint that accepts a template name and data dict,
renders a Jinja2 template, and returns the result as a PDF download.
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response

from app.shared.pdf.schemas.pdf_schemas import PdfGenerateRequest
from app.shared.pdf.services import pdf_service
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


@router.post(
    "/generate",
    summary="Generate PDF from template + data",
    response_class=Response,
    responses={
        200: {
            "content": {"application/pdf": {}},
            "description": "PDF generated successfully",
        },
        404: {"description": "Template not found"},
        422: {"description": "Validation error in request body"},
    },
)
async def generate_pdf(
    _: AdminUser,
    body: PdfGenerateRequest,
) -> Response:
    """Generate a PDF by rendering a Jinja2 template with the supplied data.

    The endpoint is generic – the ``template_name`` selects which template
    file to use (e.g. ``"cv"`` → ``cv.html.jinja2``), and ``data`` is
    passed directly to the template as keyword arguments.
    """
    try:
        pdf_bytes = await pdf_service.generate_pdf(
            template_name=body.template_name,
            data=body.data,
        )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{body.template_name}.pdf"',
        },
    )
