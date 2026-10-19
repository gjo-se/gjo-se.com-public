"""Pydantic schemas for contact form submissions (gjo_se_com).

The create schema is the single source of truth for the frontend Zod schema
via ``sync_schemas`` – field names, types and limits must match the FE form.
Spam-protection fields (``honeypot``, ``token``) are accepted but never
persisted.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

ContactLang = Literal["de", "en"]


class ContactSubmissionCreate(BaseModel):
    """Inbound contact form payload.

    ``honeypot`` is a hidden field that must stay empty (filled = bot).
    ``token`` is the server-signed proof (see ``contact_token_service``) that the
    form was loaded by the SPA – a missing or invalid token is treated as spam.
    """

    name: str = Field(min_length=1, max_length=200)
    email: EmailStr = Field(max_length=254)
    message: str = Field(min_length=1, max_length=5000)
    page: str | None = Field(default=None, max_length=200)
    lang: ContactLang = "de"
    honeypot: str | None = None
    token: str = Field(default="")


class ContactSubmissionOut(BaseModel):
    """Public response for a stored contact submission."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    message: str
    page: str | None
    lang: str
    created_at: datetime


class ContactTokenOut(BaseModel):
    """Public response for a freshly issued contact-form token."""

    token: str
    expires_at: datetime


class ContactSubmissionAdminOut(ContactSubmissionOut):
    """Admin response for a stored contact submission.

    Extends the public shape with ``ip`` – the client IP is persisted purely for
    internal pattern/block analysis and is therefore never exposed on the public
    endpoint, only via the admin API. ``is_spam`` / ``spam_reason`` mark rows
    that were dropped as spam (honeypot / token / content) so false positives
    stay reviewable.
    """

    ip: str | None
    is_spam: bool
    spam_reason: str | None
