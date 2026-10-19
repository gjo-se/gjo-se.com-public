"""Data-driven application CV builder (gjo_se_com) – stable facade.

Builds the CV context exclusively from backend data and renders it to an A4 PDF
via the generic ``pdf_service``. No LLM is involved – the content is
reproducible and free of hallucination.

The implementation is split into focused modules; this module re-exports the
public surface so consumers and tests keep importing ``cv_service``:

* :mod:`cv_context_service` – context assembly (profile, skills, experiences).
* :mod:`cv_document_service` – render, store and regenerate the CV snapshot.
* :mod:`cv_filename_service` – recruiter-friendly file names.
"""

from __future__ import annotations

from app.application.services.cv_context_service import _load_skill_groups, build_application_cv_context
from app.application.services.cv_document_service import (
    regenerate_cv_document,
    render_application_cv,
    store_cv_document,
)
from app.application.services.cv_filename_service import build_cv_filename, cv_filename_from_context
from app.shared.pdf.services import pdf_service

__all__ = [
    "_load_skill_groups",
    "build_application_cv_context",
    "build_cv_filename",
    "cv_filename_from_context",
    "pdf_service",
    "regenerate_cv_document",
    "render_application_cv",
    "store_cv_document",
]
