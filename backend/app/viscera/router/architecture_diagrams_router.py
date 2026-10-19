"""Architecture diagram API endpoints.

CRUD + node-position endpoints for the diagrams under
``architecture/{source}/diagrams/``. Split out of ``architecture_router`` into
one focused endpoint module per resource (``check-file-length``); the parent
router only composes.
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.shared.http.domain.error_mapping_rules import value_error_to_http
from app.shared.security.dependencies.auth_dependencies import AdminUser
from app.viscera.dependencies.viscera_dependencies import validate_architecture_source
from app.viscera.schemas.architecture_schemas import (
    BatchUpdateDiagramNodesRequest,
    CreateDiagramRequest,
    DiagramResponse,
    UpdateDiagramNodesRequest,
    UpdateDiagramRequest,
)
from app.viscera.services.diagram_service import (
    create_diagram,
    delete_diagram,
    list_diagrams,
    update_diagram,
    update_diagram_nodes,
    update_diagram_nodes_batch,
)

router = APIRouter()


@router.get("/diagrams", response_model=list[DiagramResponse])
async def get_diagrams(
    _admin: AdminUser,
    source: str = Query("code", description="Architecture source ('code' | 'golden')"),
) -> list[DiagramResponse]:
    """List all architecture diagrams from the source's ``diagrams/`` directory.

    ``source='code'`` (default) reads ``architecture/diagrams/``,
    ``source='golden'`` reads ``architecture/golden/diagrams/``.
    """
    validate_architecture_source(source)
    return list_diagrams(source=source)


@router.post("/diagrams", status_code=201, response_model=DiagramResponse)
async def create_architecture_diagram(
    body: CreateDiagramRequest,
    _admin: AdminUser,
    source: str = Query("code", description="Architecture source ('code' | 'golden')"),
) -> DiagramResponse:
    """Create a new architecture diagram.

    Writes ``architecture/{source}/diagrams/{key}.yml`` with the diagram
    definition (including an inline ``nodes`` map for positions). The
    request-body ``source`` takes precedence over the ``source`` query
    parameter; the resolved source is persisted as a YAML field on create.
    """
    validate_architecture_source(source)
    resolved_source = body.source
    try:
        return create_diagram(body, source=resolved_source)
    except ValueError as exc:
        raise value_error_to_http(exc, not_found_status=422, conflict_status=409) from exc


@router.delete("/diagrams/{key}")
async def delete_architecture_diagram(
    key: str,
    _admin: AdminUser,
    source: str = Query("code", description="Architecture source ('code' | 'golden')"),
) -> dict[str, str]:
    """Delete a diagram.

    Removes ``architecture/{source}/diagrams/{key}.yml`` from disk.
    """
    validate_architecture_source(source)
    try:
        return delete_diagram(key, source=source)
    except ValueError as exc:
        raise value_error_to_http(exc) from exc


@router.put("/diagrams/{key}", response_model=DiagramResponse)
async def update_architecture_diagram(
    key: str,
    body: UpdateDiagramRequest,
    _admin: AdminUser,
    source: str = Query("code", description="Architecture source ('code' | 'golden')"),
) -> DiagramResponse:
    """Update a diagram's metadata fields.

    Merges non-None fields from the request body into the diagram YAML of the
    given source. Only fields explicitly provided (not None) are overwritten.
    """
    validate_architecture_source(source)
    try:
        return update_diagram(key, body, source=source)
    except ValueError as exc:
        raise value_error_to_http(exc) from exc


@router.put("/diagrams/{key}/nodes/{node_id}", response_model=DiagramResponse)
async def update_diagram_nodes_endpoint(
    key: str,
    node_id: str,
    body: UpdateDiagramNodesRequest,
    _admin: AdminUser,
    source: str = Query("code", description="Architecture source ('code' | 'golden')"),
) -> DiagramResponse:
    """Set the position of a single node within a diagram.

    Writes ``nodes.{node_id} = {x, y}`` (plus optional ``width``/``height``
    bounds and ``description``) into ``architecture/{source}/diagrams/{key}.yml``.
    """
    validate_architecture_source(source)
    try:
        return update_diagram_nodes(
            key,
            node_id,
            body.x,
            body.y,
            body.width,
            body.height,
            body.description,
            source=source,
        )
    except ValueError as exc:
        raise value_error_to_http(exc) from exc


@router.put("/diagrams/{key}/nodes", response_model=DiagramResponse)
async def update_diagram_nodes_batch_endpoint(
    key: str,
    body: BatchUpdateDiagramNodesRequest,
    _admin: AdminUser,
    source: str = Query("code", description="Architecture source ('code' | 'golden')"),
) -> DiagramResponse:
    """Batch-update all node positions within a diagram (#2232).

    Replaces the entire ``nodes`` map in ``architecture/{source}/diagrams/{key}.yml``.
    An empty map clears all persisted positions (used by "Reset Layout").
    """
    validate_architecture_source(source)
    try:
        return update_diagram_nodes_batch(key, body.nodes, source=source)
    except ValueError as exc:
        raise value_error_to_http(exc) from exc
