"""LangFuse service wrapper – unified interface for LangFuse SDK operations.

Provides graceful degradation: when the LangFuse client is not configured,
all methods return ``None``/``False`` without raising exceptions.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any, cast

import structlog

from app.shared.llm_gateway.langfuse_client import get_langfuse_client

logger = structlog.get_logger(__name__)


class LangfuseService:
    """Wrapper around the LangFuse SDK for evaluation operations.

    Usage::

        from app.shared.llm_gateway.services.langfuse_service import langfuse_service

        dataset = await langfuse_service.create_dataset(
            "description-merge", description="Golden test set",
        )
        await langfuse_service.create_score(
            trace_id="abc123", name="accuracy", value=0.95,
        )
    """

    def __init__(self) -> None:
        self._client = get_langfuse_client()

    async def create_dataset(
        self,
        task_key: str,
        *,
        description: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        """Create a LangFuse dataset for golden test sets.

        Args:
            task_key: Task identifier used as dataset name.
            description: Optional human-readable description.
            metadata: Optional metadata dict.

        Returns:
            Dataset info dict on success, ``None`` if not configured or on error.
        """
        if self._client is None:
            logger.debug("langfuse_service: client not configured – skipping create_dataset")
            return None
        try:
            self._client.create_dataset(  # type: ignore[union-attr]
                name=task_key,
                description=description,
                metadata=metadata,
            )
            logger.info("langfuse_service: dataset '%s' created", task_key)
            return {"name": task_key, "description": description}
        except Exception:
            logger.exception("langfuse_service: create_dataset '%s' failed", task_key)
            return None

    async def create_experiment(
        self,
        task_key: str,
        dataset_name: str,
    ) -> dict[str, Any] | None:
        """Start a LangFuse Experiment for regression evaluation.

        Note: LangFuse Experiments are typically created via the SDK's
        ``create_experiment`` method or the UI. This is a placeholder that
        delegates to the client's method if available.

        Args:
            task_key: Task identifier for the experiment name.
            dataset_name: Name of the LangFuse dataset to evaluate against.

        Returns:
            Experiment info dict on success, ``None`` if not configured or on error.
        """
        if self._client is None:
            logger.debug("langfuse_service: client not configured – skipping create_experiment")
            return None
        client = cast(Any, self._client)
        try:
            if hasattr(client, "create_experiment"):
                client.create_experiment(
                    name=task_key,
                    dataset_name=dataset_name,
                )
            logger.info(
                "langfuse_service: experiment '%s' started on dataset '%s'",
                task_key,
                dataset_name,
            )
            return {"name": task_key, "dataset": dataset_name}
        except Exception:
            logger.exception("langfuse_service: create_experiment '%s' failed", task_key)
            return None

    async def run_experiment(
        self,
        dataset_name: str,
        task_function: Callable[..., Any],
        *,
        experiment_name: str | None = None,
        experiment_description: str | None = None,
        evaluators: list[Any] | None = None,
        run_evaluators: list[Any] | None = None,
        task_metadata: dict[str, Any] | None = None,
        max_concurrency: int = 5,
    ) -> dict[str, Any] | None:
        """Run a LangFuse experiment on a dataset with automatic tracing.

        Wraps ``dataset.run_experiment()`` from the LangFuse Python SDK v3+.
        The task function is called for each dataset item and its return value
        is evaluated by the optional evaluator functions. Scores are
        automatically persisted in LangFuse.

        Args:
            dataset_name: Name of the LangFuse dataset (e.g. ``"{task}-golden"``).
            task_function: Async callable ``(*, item, **kwargs) -> str`` that
                processes each dataset item and returns an output string.
            experiment_name: Human-readable experiment name (defaults to
                ``dataset_name`` with an ISO timestamp).
            experiment_description: Optional description.
            evaluators: Optional list of item-level evaluator functions.
            run_evaluators: Optional list of run-level evaluator functions.
            task_metadata: Metadata attached to all experiment traces.
            max_concurrency: Max concurrent task executions (default 5).

        Returns:
            Dict with ``run_name``, ``item_count``, ``avg_score``,
            ``item_results``, ``dataset_run_id``, ``dataset_run_url``,
            ``experiment_id``. Returns ``None`` if LangFuse is not configured.

        Raises:
            ValueError: If the dataset does not exist.
        """
        if self._client is None:
            logger.debug("langfuse_service: client not configured – skipping run_experiment")
            return None

        try:
            from langfuse import Evaluation

            dataset = self._client.get_dataset(dataset_name)  # type: ignore[union-attr]
            items = list(dataset.items)

            # Call _run_experiment_async directly instead of the sync
            # run_experiment().  The sync wrapper uses run_async_safely()
            # which spawns a NEW thread with its own event loop when called
            # from within an already-running loop (e.g. Restate/uvicorn).
            # That causes "Future attached to a different loop" because the
            # LangFuse HTTP client is bound to the original loop.
            exp_name = experiment_name or dataset_name
            result = await self._client._run_experiment_async(  # type: ignore[union-attr]
                name=exp_name,
                run_name=exp_name,
                description=experiment_description,
                data=items,
                task=task_function,
                evaluators=evaluators or [],
                composite_evaluator=None,
                run_evaluators=run_evaluators or [],
                max_concurrency=max_concurrency,
                metadata=task_metadata,
            )

            # Extract scores from evaluator results
            item_results: list[dict[str, Any]] = []
            scores: list[float] = []
            for item_result in getattr(result, "item_results", []) or []:
                item_scores = []
                evaluations = getattr(item_result, "evaluations", []) or []
                for ev in evaluations:
                    if isinstance(ev, Evaluation):
                        item_scores.append(ev.value)
                    elif isinstance(ev, dict):
                        item_scores.append(ev.get("value", 0))
                item_score = sum(item_scores) / len(item_scores) if item_scores else 0.0
                scores.append(item_score)
                item_results.append(
                    {
                        "item_id": getattr(getattr(item_result, "item", None), "id", None),
                        "score": item_score,
                        "output": getattr(item_result, "output", None),
                        "evaluations": [
                            {
                                "name": ev.name if isinstance(ev, Evaluation) else ev.get("name", "?"),
                                "value": ev.value if isinstance(ev, Evaluation) else ev.get("value", 0),
                            }
                            for ev in evaluations
                        ],
                    }
                )

            avg_score = sum(scores) / len(scores) if scores else 0.0

            logger.info(
                "langfuse_service: experiment '%s' completed: %d items, avg_score=%.4f",
                dataset_name,
                len(item_results),
                avg_score,
            )
            return {
                "run_name": getattr(result, "run_name", experiment_name),
                "item_count": len(item_results),
                "avg_score": round(avg_score, 4),
                "item_results": item_results,
                "dataset_run_id": getattr(result, "dataset_run_id", None),
                "dataset_run_url": getattr(result, "dataset_run_url", None),
                "experiment_id": getattr(result, "experiment_id", None),
            }
        except Exception:
            logger.exception("langfuse_service: run_experiment '%s' failed", dataset_name)
            return None

    async def create_score(
        self,
        *,
        trace_id: str,
        name: str,
        value: float,
    ) -> bool:
        """Attach a score to a LangFuse trace.

        Args:
            trace_id: The LangFuse trace ID to score.
            name: Score name (e.g. ``"accuracy"``).
            value: Numeric score value.

        Returns:
            ``True`` on success, ``False`` if not configured or on error.
        """
        if self._client is None:
            logger.debug("langfuse_service: client not configured – skipping create_score")
            return False
        try:
            self._client.create_score(  # type: ignore[union-attr]
                trace_id=trace_id,
                name=name,
                value=value,
            )
            logger.info(
                "langfuse_service: scored trace '%s' with %s=%.4f",
                trace_id,
                name,
                value,
            )
            return True
        except Exception:
            logger.exception(
                "langfuse_service: create_score '%s' %s=%.4f failed",
                trace_id,
                name,
                value,
            )
            return False

    async def get_prompt(
        self,
        prompt_name: str,
        label: str = "production",
    ) -> dict[str, Any] | None:
        """Fetch a prompt from LangFuse.

        Args:
            prompt_name: Name of the prompt in LangFuse.
            label: Prompt label (default ``"production"``).

        Returns:
            Dict with ``name``, ``label``, and ``prompt`` text, or ``None``
            if not configured or on error.
        """
        if self._client is None:
            logger.debug("langfuse_service: client not configured – skipping get_prompt")
            return None
        try:
            prompt = self._client.get_prompt(  # type: ignore[union-attr]
                name=prompt_name,
                label=label,
            )
            logger.info(
                "langfuse_service: prompt '%s' (label='%s') fetched",
                prompt_name,
                label,
            )
            return {
                "name": prompt_name,
                "label": label,
                "prompt": str(prompt) if prompt else "",
            }
        except Exception:
            logger.exception(
                "langfuse_service: get_prompt '%s' (label='%s') failed",
                prompt_name,
                label,
            )
            return None
