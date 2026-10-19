"""Backward-compatible facade over the shared start-date parsing module.

The deterministic start-date resolution moved to
``app.shared.parsing.start_dates`` so the fbf context can parse manual start
tokens without importing ``app.application`` (import-linter Achse 1, Group F).
This module keeps the historical application import path for the application
services and their tests.
"""

from app.shared.parsing.start_dates import (
    IGNORE_TOKENS,
    IMMEDIATE_TOKENS,
    SOURCE_FIELD,
    SOURCE_MANUAL,
    SOURCE_TEXT,
    Precision,
    RequiredStart,
    is_immediate_token,
    render_start,
    requires_immediate_start,
    resolve_required_start,
    start_from_field,
    start_from_manual,
    start_from_text,
)

__all__ = [
    "IGNORE_TOKENS",
    "IMMEDIATE_TOKENS",
    "SOURCE_FIELD",
    "SOURCE_MANUAL",
    "SOURCE_TEXT",
    "Precision",
    "RequiredStart",
    "is_immediate_token",
    "render_start",
    "requires_immediate_start",
    "resolve_required_start",
    "start_from_field",
    "start_from_manual",
    "start_from_text",
]
