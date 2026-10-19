"""Shared state schema for the LLM pipeline graph."""

from __future__ import annotations

from typing import Required, TypedDict


class PipelineState(TypedDict, total=False):
    """State that flows through every node in the pipeline graph.

    All fields are optional so nodes can write incrementally without
    requiring the caller to pre-populate every key.
    """

    # ── Input ────────────────────────────────────────────────────────────────
    project_id: Required[int]
    """The master project to operate on."""

    # ── Merge node output ────────────────────────────────────────────────────
    merged_text: str
    """Accumulated merge output (empty string when merge hasn't run)."""

    # ── Flow control ─────────────────────────────────────────────────────────
    skip_merge: bool
    """When True the merge node is a no-op (merge already completed externally,
    e.g. by the streaming HTTP endpoint)."""

    # ── Outcome ──────────────────────────────────────────────────────────────
    error: str
    """Human-readable error message when a node fails."""

    status: str
    """Free-form status string for LangSmith trace (e.g. 'ok', 'merged',
    'extracted')."""
