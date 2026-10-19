"""Restate SQL state queries — durable state lookups with safe SQL interpolation.

Provides ``get_workflow_state`` and its task/scan-code wrappers, plus the
``require_safe_sql_value`` guard for the Restate ``/query`` endpoint (which has
no parameter binding). Split out of :mod:`client` – state queries are a distinct
concern from dispatch and deployment lifecycle.
"""

from __future__ import annotations

import json
import re
from http import HTTPStatus
from typing import Any

import structlog

from app.shared.config.config import settings
from app.shared.workflow_runtime.infrastructure.restate.client import get_restate_client

logger = structlog.get_logger(__name__)


class UnsafeSqlValueError(ValueError):
    """Ein Wert enthält Zeichen, die für eine SQL-Interpolation unsicher sind."""


#: Erlaubter Zeichensatz für Werte, die in ein Restate-``/query``-SQL-Literal
#: interpoliert werden (Workflow-Namen/-Keys, Task-IDs). Ausgeschlossen sind
#: insbesondere ``'``, ``\``, ``;``, ``%`` und Whitespace – damit kann der Wert
#: nicht aus seinem ``'…'``-Literal ausbrechen. Restate's SQL-Introspection-API
#: kennt **kein** Parameter-Binding, daher ist diese Validierung der Schutz.
_SAFE_SQL_VALUE = re.compile(r"^[A-Za-z0-9_.-]+$")


def require_safe_sql_value(value: str, *, field: str) -> str:
    """Validiert ``value`` für die Interpolation in ein SQL-String-Literal.

    Restate's ``/query``-Endpunkt akzeptiert nur einen rohen SQL-String (kein
    Parameter-Binding). Werte, die aus Request-Bodies, Pfad-Parametern oder
    Aufrufern stammen, müssen deshalb vor der Interpolation auf einen engen
    Zeichensatz festgenagelt werden, damit sie nicht aus ihrem ``'…'``-Literal
    ausbrechen (SQL-Injection, CWE-89).

    Args:
        value: Der zu prüfende Wert (z. B. ein Restate-Workflow-Key).
        field: Feldname für die Fehlermeldung.

    Returns:
        Den unveränderten Wert, sofern er dem strikten Zeichensatz entspricht.

    Raises:
        UnsafeSqlValueError: Wenn ``value`` Zeichen außerhalb des
            Allowlist-Zeichensatzes enthält.
    """
    if not _SAFE_SQL_VALUE.fullmatch(value):
        raise UnsafeSqlValueError(f"{field!r} enthält unerlaubte Zeichen für eine Restate-SQL-Query: {value!r}")
    return value


async def get_workflow_state(workflow_name: str, workflow_key: str) -> dict[str, Any] | None:
    """Query the durable state of a Restate workflow via the SQL query API.

    Uses Restate's ``/query`` endpoint with SQL to read state rows
    for the given workflow service and key.

    Args:
        workflow_name: Name of the Restate workflow (e.g. ``"RetryBatchWorkflow"``).
        workflow_key: The workflow key used at invocation time.

    Returns:
        Dict of state key-value pairs, or ``None`` if the query fails.

    Raises:
        UnsafeSqlValueError: When ``workflow_name`` or ``workflow_key`` contains
            characters unsafe for SQL interpolation (CWE-89 protection).
    """
    safe_name = require_safe_sql_value(workflow_name, field="workflow_name")
    safe_key = require_safe_sql_value(workflow_key, field="workflow_key")
    query = f"SELECT key, value_utf8 FROM state WHERE service_name = '{safe_name}' AND service_key = '{safe_key}'"
    try:
        response = await get_restate_client().post(
            f"{settings.RESTATE_URL}/query",
            json={"query": query},
            headers={"Accept": "application/json"},
        )
        if response.is_success:
            data = response.json()
            # Restate's /query returns rows as positional arrays, not objects;
            # keep the runtime dict/array discrimination below.
            rows: list[Any] = data.get("rows", [])
            if not rows:
                return None
            # Reconstruct state dict from key/value rows
            state: dict[str, Any] = {}
            for row in rows:
                key = row.get("key") if isinstance(row, dict) else row[0]
                value_utf8 = row.get("value_utf8") if isinstance(row, dict) else row[1]
                if key and value_utf8 is not None:
                    try:
                        state[key] = json.loads(value_utf8) if isinstance(value_utf8, str) else value_utf8
                    except (json.JSONDecodeError, TypeError):
                        state[key] = value_utf8
            return state if state else None
        if response.status_code == HTTPStatus.NOT_FOUND:
            return None
        logger.warning(
            "Restate state query %s/%s returned %d",
            workflow_name,
            workflow_key,
            response.status_code,
        )
    except Exception:
        logger.exception(
            "Restate state query failed for %s/%s",
            workflow_name,
            workflow_key,
        )
    return None


async def get_batch_progress(job_id: str) -> dict[str, Any] | None:
    """Read the progress key for a batch job from Restate state.

    Args:
        job_id: The Restate workflow key (``rs_...``).

    Returns:
        Progress dict with ``done``, ``total``, ``status`` keys, or ``None``
        if not found.
    """
    state = await get_workflow_state("RetryBatchWorkflow", job_id)
    if state:
        return state.get("progress")
    return None


async def get_scan_code_state(workflow_key: str) -> dict[str, Any] | None:
    """Query the durable state of a ScanCodeWorkflow.

    Args:
        workflow_key: The workflow key used at invocation time.

    Returns:
        Dict with ``status``, ``current_activity``, ``result``, ``error``
        keys, or ``None`` if the query fails.
    """
    state = await get_workflow_state("ScanCodeWorkflow", workflow_key)
    if state:
        # Restate state values are stored as-is; ensure keys exist
        return {
            "status": state.get("status", "running"),
            "current_activity": state.get("current_activity"),
            "result": state.get("result"),
            "error": state.get("error"),
        }
    return None
