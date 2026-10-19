"""Node-summary API router.

Serves the on-demand LLM summary endpoint for derived viscera nodes (L3
components / L4 modules). Split out of ``architecture_router`` so the
architecture CRUD router stays cohesive (``check-module-lcom4``) – the
node-summary family is an independent collaborator branch.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.shared.security.dependencies.auth_dependencies import AdminUser
from app.viscera.repositories.file.architecture_repository import ArchitectureStore
from app.viscera.schemas.architecture_schemas import NodeSummaryResponse
from app.viscera.services.node_summary_service import (
    generate_node_summary as generate_node_summary_on_demand,
)
from app.viscera.services.node_summary_service import node_exists as node_summary_node_exists

router = APIRouter()


def _node_summary_known(arch_root: Path, node_id: str) -> bool:
    """Check whether ``node_id`` is a known ``top_level`` or module ``name``.

    Validates the node id against ``imports/backend.json`` so an unknown key
    returns a 404 before any LLM call is made.
    """
    return node_summary_node_exists(arch_root, node_id)


@router.post("/nodes/{node_id}/summary", response_model=NodeSummaryResponse)
async def generate_node_summary_endpoint(node_id: str, _admin: AdminUser) -> NodeSummaryResponse:
    """Generate an on-demand LLM summary for a single derived node (L3/L4).

    ``node_id`` is either a component key (``top_level``, L3) or a module
    ``name`` (L4). The summary is generated from the node docstrings via the
    ``component-summary`` task and returned – **read-only**, no file write.
    Persisting the description is exclusively the FE's job (diagram sync).

    An unknown ``node_id`` (neither ``top_level`` nor module ``name``) yields a
    404. An LLM failure is a graceful skip (HTTP 200 with ``skipped=True``) –
    never a 5xx for the user.
    """
    arch_root = ArchitectureStore().root()
    if not _node_summary_known(arch_root, node_id):
        raise HTTPException(
            status_code=404,
            detail=f"Node '{node_id}' nicht gefunden (weder top_level noch Modul-name)",
        )
    result = await generate_node_summary_on_demand(node_id, trigger="on-demand-node-summary")
    return NodeSummaryResponse(**result)
