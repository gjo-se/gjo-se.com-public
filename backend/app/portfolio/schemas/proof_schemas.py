"""Pydantic schemas for the portfolio proof API (gjo_se_com).

Combines the admin write DTOs and the public read DTOs.

Admin (``proof_in`` / ``proof_out``):
    The admin write API carries proof structure fields (``image_src``) and the
    localized DE/EN statements in a single payload. ``statements`` is a
    ``dict[str, str]`` keyed by locale (``de`` required for create).

Public (``proof_out``):
    Read-only proof DTO with a single localized statement.
"""

from typing import Literal

from pydantic import BaseModel, Field

Priority = Literal["high", "medium"]


class ProofCreate(BaseModel):
    """Request body for creating a proof with its localized statements.

    ``statements`` maps a locale to its statement text and must contain at
    least ``de``. ``image_src`` is an optional path string (no URL validation).
    """

    image_src: str | None = Field(default=None, max_length=500)
    statements: dict[str, str] = Field(
        default_factory=dict,
        description="locale → statement, mind. 'de'",
    )
    priority: Priority = "medium"
    questions: dict[str, str] | None = Field(
        default=None,
        description="locale → Vertrauensfrage; optional, upsert pro Locale",
    )


class ProofUpdate(BaseModel):
    """Request body for partially updating a proof.

    All fields are optional. When ``statements`` is provided, the existing
    translation rows are replaced with the new set (translation-table pattern)
    and must contain at least ``de``.
    """

    image_src: str | None = Field(default=None, max_length=500)
    statements: dict[str, str] | None = Field(
        default=None,
        description="locale → statement; ersetzt bestehende Rows via replace",
    )
    priority: Priority | None = None
    questions: dict[str, str] | None = Field(
        default=None,
        description="locale → Vertrauensfrage; optional, upsert pro Locale",
    )


class ProofReorderRequest(BaseModel):
    """Request body for batch-reordering a portfolio's proofs.

    ``ordered_ids`` lists the proof ids in desired order; the list index
    becomes the proof's ``sort`` value.
    """

    ordered_ids: list[int] = Field(..., min_length=1)


class ProofOut(BaseModel):
    """Serialized portfolio proof for the public proofs endpoint.

    ``statement`` is the localized proof statement (picked from the requested
    locale, falling back to German). Fields are flat – no translation nesting.
    """

    id: int
    image_src: str | None = None
    statement: str | None = None
    priority: str = "medium"
    question: str | None = None


class ProofAdminOut(BaseModel):
    """Serialized portfolio proof for the admin proofs endpoint.

    ``statements`` carries all localized statement rows as ``dict[str, str]``
    keyed by locale (no locale picking/fallback – the admin edits every
    language individually).
    """

    id: int
    image_src: str | None = None
    sort: int = 0
    statements: dict[str, str]
    priority: str = "medium"
    questions: dict[str, str] = {}


__all__ = [
    "Priority",
    "ProofAdminOut",
    "ProofCreate",
    "ProofOut",
    "ProofReorderRequest",
    "ProofUpdate",
]
