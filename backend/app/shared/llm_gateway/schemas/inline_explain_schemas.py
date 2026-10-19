"""Pydantic schemas for the inline-explain endpoint."""

from __future__ import annotations

from pydantic import BaseModel, Field


class InlineExplainRequest(BaseModel):
    """Request body for the inline-explain endpoint."""

    term: str = Field(..., min_length=1, max_length=500, description="Der zu erklärende Fachbegriff")
    context: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="Der umgebende Text, in dem der Begriff vorkommt",
    )


class InlineExplainResponse(BaseModel):
    """Response body for the inline-explain endpoint."""

    explanation: str = Field(..., description="Die generierte Erklärung des Begriffs")
    call_log_id: int | None = Field(None, description="ID des zugehörigen LLM-Call-Logs")
