"""Hyperparameter merge service – combines model defaults with task overrides.

Used by :class:`EvaluationService` (INC 2) to build the final hyperparameter
dict passed to API calls. Follows the "override per key" principle:
every key in *eval_overrides* wins over the corresponding key in
*model_defaults*; keys only present in *model_defaults* are kept as-is.
"""

from __future__ import annotations

from typing import Any


class HyperparameterService:
    """Merges model default hyperparameters with task-specific overrides.

    Usage::

        from app.shared.llm_gateway.services.hyperparameter_service import hyperparameter_service

        merged = hyperparameter_service.merge(
            model_defaults={"temperature": 0.7, "max_tokens": 1000},
            eval_overrides={"temperature": 0.3},
        )
        # → {"temperature": 0.3, "max_tokens": 1000}
    """

    @staticmethod
    def merge(
        model_defaults: dict[str, Any],
        eval_overrides: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Merge *eval_overrides* on top of *model_defaults*.

        Args:
            model_defaults: The model's default hyperparameters (can be empty).
            eval_overrides: Optional task-specific overrides. Keys present
                here take precedence over the same keys in *model_defaults*.
                New keys (not in defaults) are also included.

        Returns:
            A new dict with defaults overridden per-key.
        """
        return {**model_defaults, **(eval_overrides if eval_overrides else {})}
