#!/usr/bin/env python3
"""CLI runner for LLM task evaluation gates.

Usage::

    python -m app.shared.llm_gateway.services.eval_runner_service --task description-merge
    python -m app.shared.llm_gateway.services.eval_runner_service --task description-merge --trigger manual

Exit codes:
    0 – all candidates passed
    1 – at least one candidate failed or blocked
    2 – invalid task key or usage error
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys

from app.shared.llm_gateway.domain.task_registry_rules import TASK_REGISTRY


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse command-line arguments for the eval runner.

    Args:
        argv: Argument list to parse; defaults to ``sys.argv`` when ``None``.

    Returns:
        Namespace with ``task`` and ``trigger``.
    """
    parser = argparse.ArgumentParser(
        description="Run the LLM evaluation gate suite for a task.",
    )
    parser.add_argument(
        "--task",
        required=True,
        help="Task key from TASK_REGISTRY (e.g. description-merge)",
    )
    parser.add_argument(
        "--trigger",
        default="manual",
        help="Trigger label (default: manual)",
    )
    return parser.parse_args(argv)


async def _async_main(task_key: str, trigger: str) -> int:
    """Run the gate suite and print results as JSON to stdout."""
    from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_evaluation_service
    from app.shared.llm_gateway.repositories.eval_run_repository import open_session

    async with open_session() as db:
        runs = await get_evaluation_service().run_gates(db, task_key, trigger)

    results = [
        {
            "id": run.id,
            "task": run.task,
            "model_config_id": run.model_config_id,
            "trigger": run.trigger,
            "overall_status": run.overall_status,
            "gate_results": run.gate_results,
            "created_at": run.created_at.isoformat() if run.created_at else None,
        }
        for run in runs
    ]

    print(json.dumps(results, indent=2, default=str))

    if not runs:
        return 0

    # Exit 0 only if ALL candidates passed.
    if all(run.overall_status == "passed" for run in runs):
        return 0
    return 1


def main(argv: list[str] | None = None) -> int:
    """Entry point for the eval-runner CLI."""
    args = _parse_args(argv)

    if args.task not in TASK_REGISTRY:
        print(
            f"Error: Unknown task '{args.task}'. Valid tasks: {', '.join(sorted(TASK_REGISTRY.keys()))}",
            file=sys.stderr,
        )
        return 2

    return asyncio.run(_async_main(args.task, args.trigger))


if __name__ == "__main__":
    sys.exit(main())
