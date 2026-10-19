"""SQLAlchemy model for LLM task model configuration.

Each row represents one model configuration for a task. Boolean flags
(``is_production``, ``is_fallback``, ``is_eval``) control the role
without requiring separate tables.

``is_production`` and ``is_fallback`` are mutually exclusive
(enforced by a CHECK constraint). Both can additionally have
``is_eval=True`` so a model that passed evaluation can be promoted
to production without reconfiguration.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base
from app.shared.db_access.timestamp_mixin import TimestampMixin

if TYPE_CHECKING:
    from app.shared.credential_store.models.admin_credential import AdminCredential
    from app.shared.llm_gateway.models.model import LLMModel


class TaskModelConfig(TimestampMixin, Base):
    """Unified model configuration for a single task–model pair.

    A task can have **one** production row, **one** fallback row, and
    **one** judge row (enforced by partial unique indexes + CHECK constraints).
    Any number of eval rows are allowed.

    Attributes:
        id: Primary key.
        task: Task key from ``TASK_REGISTRY``, e.g. ``"description-merge"``.
        model_id: FK to :class:`LLMModel` – the model being configured.
        credential_id: FK to :class:`AdminCredential` (nullable).
        hyperparameters: JSON dict of task-specific overrides,
            e.g. ``{"temperature": 0.3, "max_tokens": 2000}``.
        is_production: This row is the primary production model.
        is_fallback: This row is the fallback model (mutually exclusive
            with ``is_production``).
        is_eval: This row should be included in evaluation runs.
        is_active: Row-level active toggle → shared_statusable (shared_task_model_config).
        is_judge: This row is the judge model for LLM-as-Judge evaluation
            (max 1 per task, mutually exclusive with is_production).
        created_at: Row creation timestamp (set by DB).
        updated_at: Last update timestamp (set by DB on update).
    """

    __tablename__ = "shared_task_model_config"
    __table_args__ = (
        UniqueConstraint("task", "model_id", name="uq_task_model_config"),
        CheckConstraint(
            "NOT (is_production = true AND is_fallback = true)",
            name="ck_production_xor_fallback",
        ),
        CheckConstraint(
            "NOT (is_judge = true AND is_production = true)",
            name="ck_judge_xor_production",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="Task-Key aus TASK_REGISTRY",
    )
    model_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("shared_model.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    credential_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("shared_admin_credential.id", ondelete="SET NULL"),
        nullable=True,
    )
    hyperparameters: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Task-spezifische Hyperparameter-Overrides",
    )
    is_production: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="Primary production model for this task",
    )
    is_fallback: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="Fallback model (mutually exclusive with is_production)",
    )
    is_eval: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        comment="Include this model in evaluation runs",
    )
    is_judge: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="Judge model for LLM-as-Judge evaluation (max 1 per task)",
    )

    # Relationships
    model: Mapped[LLMModel | None] = relationship("LLMModel", lazy="noload")
    credential: Mapped[AdminCredential | None] = relationship(
        "AdminCredential",
        lazy="noload",
    )

    @property
    def model_display_name(self) -> str | None:
        """Delegiert an ``model.display_name`` für Pydantic ``from_attributes``."""
        return self.model.display_name if self.model else None

    @property
    def provider_name(self) -> str | None:
        """Delegiert an ``model.provider.display_name``."""
        if self.model and self.model.provider:
            return self.model.provider.display_name
        return None

    @property
    def credential_label(self) -> str | None:
        """Delegiert an ``credential.label``."""
        return self.credential.label if self.credential else None
