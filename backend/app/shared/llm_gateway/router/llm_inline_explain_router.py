"""Admin route: explain a term in context via the inline-explain LLM task."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access.session import get_db
from app.shared.llm_gateway.client.client import LLMClient
from app.shared.llm_gateway.exceptions import (
    LLMCallError,
    NoCredentialForTaskError,
    NoModelForTaskError,
)
from app.shared.llm_gateway.schemas.inline_explain_schemas import (
    InlineExplainRequest,
    InlineExplainResponse,
)
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


@router.post(
    "/inline-explain",
    response_model=InlineExplainResponse,
    status_code=status.HTTP_200_OK,
    summary="[Admin] Explain a term in context using the inline-explain LLM task",
)
async def inline_explain(
    body: InlineExplainRequest,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> InlineExplainResponse:
    """Execute the ``inline-explain`` task via the full LLM pipeline.

    Resolves task mapping → model → credential → prompt (Langfuse) → LLM →
    call-log → Langfuse tracing. Returns the explanation and the call-log id.

    Args:
        body: Request with ``term`` and ``context``.
        _admin: Admin user guard.
        db: Async database session.

    Returns:
        InlineExplainResponse with ``explanation`` and optional ``call_log_id``.

    Raises:
        HTTPException 503: No model or credential configured for the task.
        HTTPException 502: LLM call failed (provider error, rate limit, etc.).
    """
    try:
        client = LLMClient.__new__(LLMClient)
        client._call_log_id = None

        explanation = await client.call_text(
            db,
            task="inline-explain",
            variables={"term": body.term, "context": body.context},
            trigger="context-menu",
        )

        return InlineExplainResponse(
            explanation=explanation,
            call_log_id=client._call_log_id,
        )
    except NoModelForTaskError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Kein Modell für Task 'inline-explain' konfiguriert: {exc}",
        ) from exc
    except NoCredentialForTaskError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Kein Credential für Task 'inline-explain' konfiguriert: {exc}",
        ) from exc
    except LLMCallError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM-Aufruf fehlgeschlagen: {exc}",
        ) from exc
