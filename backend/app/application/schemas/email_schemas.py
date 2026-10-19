"""Pydantic schemas for the application email router."""

from pydantic import BaseModel, EmailStr, Field


class TestEmailRequest(BaseModel):
    """Request body for the test application email endpoint."""

    to_email: EmailStr = Field(..., description="Empfänger-Email-Adresse")
    to_name: str = Field(..., min_length=1, description="Empfänger-Name")
    project_id: int = Field(..., gt=0, description="Projekt-ID für den Mail-Kontext")
    pdf_paths: list[str] | None = Field(default=None, description="Absolute Pfade zu PDF-Anhängen")


class EmailResponse(BaseModel):
    """Response after sending an application email."""

    status: str = Field(..., description="'sent' bei Erfolg")
