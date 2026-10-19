"""Shared Restate activity invocation for workflows.

Workflows invoke activities through ``ctx.generic_call`` with a JSON-encoded
argument and a JSON-decoded result. That boilerplate was copied verbatim into
every workflow as a private ``_call_activity`` (only the optional routing
``key`` differed). This helper centralises it at one owner so the copies can be
deleted.
"""

from __future__ import annotations

import json
from typing import Any

from restate import WorkflowContext


async def call_activity(
    ctx: WorkflowContext,
    service: str,
    arg: dict[str, Any],
    *,
    key: int | str | None = None,
) -> dict[str, Any]:
    """Invoke a Restate activity via ``ctx.generic_call``.

    Plain Services (not VirtualObjects/Workflows) reject a routing key, so
    ``key`` defaults to ``None``; keyed activities pass their key explicitly.

    Args:
        ctx: The calling workflow context.
        service: Activity service name (e.g. ``"MergeActivity"``).
        arg: JSON-serializable argument for the activity's ``run`` handler.
        key: Optional routing key; serialised to ``str`` when provided.

    Returns:
        The JSON-decoded result of the activity.
    """
    arg_bytes = json.dumps(arg).encode("utf-8")
    result_bytes = await ctx.generic_call(
        service=service,
        handler="run",
        arg=arg_bytes,
        key=str(key) if key is not None else None,
    )
    return json.loads(result_bytes)
