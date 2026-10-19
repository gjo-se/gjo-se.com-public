"""SQLAlchemy model for LLM evaluation run history.

Each row represents one complete gate run (Gate 1a–2) for a specific
candidate model configuration, triggered manually or automatically.
The ``gate_results`` JSON column stores per-gate status, scores and
details.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db_access.base import Base


class EvalRun(Base):
    """Historisiert jeden Gate-Durchlauf für einen LLM-Task-Kandidaten.

    Created by :class:`EvaluationService.run_gates()` for each
    ``is_active=true`` candidate. Stored for auditability and trend
    analysis.

    Attributes:
        id: Primary key.
        task: Task key from ``TASK_REGISTRY``, e.g. ``"description-merge"``.
        model_config_id: FK to the candidate :class:`TaskModelConfig`
            that was evaluated.
        batch_id: Shared UUID for all runs from the same ``run_gates()``
            invocation. Used to group candidates for comparison.
        trigger: What triggered this run –
            ``"manual"``, ``"prompt_change"``, ``"model_change"``,
            ``"scheduled"``, ``"eval_config_change"``.
        gate_results: JSON array of per-gate results. Each entry:
            ``{"gate": "1a", "status": "passed", "score": 1.0,
            "details": {...}, "timestamp": "..."}``.
        overall_status: Aggregate result – ``"passed"``, ``"failed"``,
            or ``"blocked"``.
        reviewer: Who performed the review – ``"REX"`` or a system name.
        created_at: Row creation timestamp (set by DB).
    """

    __tablename__ = "shared_eval_run"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="Task-Key aus TASK_REGISTRY",
    )
    model_config_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("shared_task_model_config.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK to the candidate config that was evaluated",
    )
    batch_id: Mapped[str | None] = mapped_column(
        String(36),
        nullable=True,
        index=True,
        comment="Shared UUID for all runs in the same run_gates() batch",
    )
    trigger: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="manual, prompt_change, model_change, scheduled, eval_config_change",
    )
    gate_results: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Pro Gate: status, score, details, timestamp",
    )
    overall_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="passed, failed, or blocked",
    )
    reviewer: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="REX oder System-Name",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
