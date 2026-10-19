"""CI/observation gate 1a: prompt-registry contract validation.

The schema (1b), stability (2a) and audit (2b) gates live in their own
modules (``schema_gate`` / ``stability_gate`` / ``audit_gate``).
"""

from __future__ import annotations

import re

from app.shared.db_access.session_types import AsyncSession
from app.shared.llm_gateway.domain.task_registry_rules import TASK_REGISTRY
from app.shared.llm_gateway.services.gates.base import GateResult


class ContractGate:
    """Gate 1a: validate that prompt placeholders match the task registry."""

    _PLACEHOLDER_RE = re.compile(r"\{(\w+)\}")

    async def _gate_contract(
        self,
        db: AsyncSession,
        task_key: str,
    ) -> GateResult:
        """Validate that prompt placeholders match TASK_REGISTRY definitions."""
        definition = TASK_REGISTRY[task_key]
        registry_keys = {ph.key for ph in definition.placeholders}

        from app.shared.llm_gateway.dependencies.llm_gateway_dependencies import get_prompt_service

        prompt_template = await get_prompt_service().get_active_prompt(task_key)
        if prompt_template is None:
            return GateResult(
                gate="contract_validation",
                status="blocked",
                score=0,
                details={"reason": "No active prompt template"},
            )

        prompt_text = (prompt_template.system_prompt or "") + " " + prompt_template.user_prompt
        prompt_keys = set(self._PLACEHOLDER_RE.findall(prompt_text))

        missing = sorted(registry_keys - prompt_keys)
        unknown = sorted(prompt_keys - registry_keys)
        passed = len(missing) == 0 and len(unknown) == 0

        return GateResult(
            gate="contract_validation",
            status="passed" if passed else "failed",
            score=1.0 if passed else 0.0,
            details={
                "prompt_placeholders": sorted(prompt_keys),
                "registry_placeholders": sorted(registry_keys),
                "missing_in_prompt": missing,
                "unknown_in_prompt": unknown,
            },
        )
