"""Admin route: submit a rejected notice to the LLM pipeline."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.db_access.session import get_db
from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_task_executor_service
from app.shared.llm_gateway.domain.task_registry_rules import RejectedNoticeTrigger
from app.shared.llm_gateway.exceptions import (
    LLMCallError,
    NoCredentialForTaskError,
    NoModelForTaskError,
)
from app.shared.llm_gateway.schemas.rejected_notice_schemas import (
    RejectedNoticeOut,
    RejectedNoticeRequest,
    RejectedNoticeResponse,
)
from app.shared.security.dependencies.auth_dependencies import AdminUser

logger = structlog.get_logger(__name__)

router = APIRouter()


@router.post(
    "/rejected-notice",
    status_code=status.HTTP_200_OK,
    summary="[Admin] Submit a rejected-notice for LLM prompt improvement and object correction",
)
async def rejected_notice(
    body: RejectedNoticeRequest,
    _admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> RejectedNoticeResponse:
    """Submit a rejected-object notice to the LLM pipeline.

    Triggers the ``rejected-notice`` task which (a) analyzes the rejection
    reason for prompt improvement and (b) generates a corrected object.
    The corrected object is written to ``workspace.yml`` with
    status ``pending``.

    Args:
        body: Request with object_id, object_type, yaml_fragment, reason,
              and optional prompt_suggestion and context.
        _admin: Admin user guard.
        db: Async database session.

    Returns:
        RejectedNoticeResponse with ``notice_id`` and ``status``.

    Raises:
        HTTPException 503: No model or credential configured for the task.
        HTTPException 502: LLM call failed.
    """
    from uuid import uuid4

    notice_id = str(uuid4())

    try:
        result = await get_task_executor_service().execute_task(
            db=db,
            task_key="rejected-notice",
            variables={
                "object_id": body.object_id,
                "object_type": body.object_type,
                "yaml_fragment": body.yaml_fragment,
                "reason": body.reason,
                "prompt_suggestion": body.prompt_suggestion or "",
                "context": str(body.context) if body.context else "",
            },
            trigger=RejectedNoticeTrigger.UI,
        )
    except NoModelForTaskError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Kein Modell für Task 'rejected-notice' konfiguriert: {exc}",
        ) from exc
    except NoCredentialForTaskError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Kein Credential für Task 'rejected-notice' konfiguriert: {exc}",
        ) from exc
    except LLMCallError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM-Aufruf fehlgeschlagen: {exc}",
        ) from exc

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM-Task fehlgeschlagen: {result.get('error_type', 'unknown')}",
        )

    # Write corrected object to architecture YAML
    llm_output = result["result"]
    if not isinstance(llm_output, (dict, RejectedNoticeOut)):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="LLM-Output hat kein korrigiertes Objekt",
        )

    logger.warning(
        "Corrected object '%s' not written — write_corrected_to_soll removed, replacement pending",
        body.object_id,
    )

    return RejectedNoticeResponse(notice_id=notice_id, status="accepted")
