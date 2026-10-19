"""Schemas for the rejected-notice LLM task and its admin endpoint.

The ``rejected-notice`` task is defined in the shared LLM task registry
(``app.shared.llm_gateway.domain.task_registry_rules``); these DTOs are its request,
response and structured-output contract. They live in ``shared`` so the
shared LLM gateway router can serve the endpoint without importing the
``viscera`` bounded context.
"""

from typing import Any

from pydantic import BaseModel, Field


class RejectedNoticeRequest(BaseModel):
    """Payload for the rejected-notice endpoint."""

    object_id: str = Field(..., min_length=1, description="Dot-separated object ID")
    object_type: str = Field(..., min_length=1, description="Object type (System, Container, Component, etc.)")
    yaml_fragment: str = Field(..., min_length=1, description="YAML fragment of the rejected object")
    reason: str = Field(..., min_length=10, description="Reason for rejecting the LLM-generated object")
    prompt_suggestion: str | None = Field(default=None, description="Optional prompt improvement suggestion")
    context: dict[str, Any] | None = Field(default=None, description="Optional context (diagram, edges)")


class RejectedNoticeResponse(BaseModel):
    """Response after a rejected notice has been accepted."""

    notice_id: str = Field(..., description="Unique identifier for the rejected notice")
    status: str = Field(default="accepted", description="Status of the notice submission")


class RejectedNoticeOut(BaseModel):
    """Structured output of the rejected_notice LLM task.

    Contains the LLM's prompt improvement analysis and corrected object.
    """

    prompt_improvement: str = Field(..., description="LLM's analysis and suggested improvement for the prompt")
    corrected_object: dict[str, Any] = Field(..., description="The corrected architecture object as a dictionary")
