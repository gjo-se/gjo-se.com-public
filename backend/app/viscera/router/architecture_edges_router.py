"""Architecture edge API endpoints.

CRUD endpoints for architecture edges under ``architecture/{source}/edges/``.
Split out of ``architecture_router`` into one focused endpoint module per
resource (``check-file-length``); the parent router only composes.
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.shared.http.domain.error_mapping_rules import file_not_found_to_http, value_error_to_http
from app.shared.security.dependencies.auth_dependencies import AdminUser
from app.viscera.dependencies.viscera_dependencies import validate_architecture_source
from app.viscera.schemas.architecture_schemas import (
    CreateEdgeRequest,
    CreateEdgeResponse,
    EdgeOut,
    UpdateEdgeRequest,
)
from app.viscera.services.architecture_service import create_edge, delete_edge
from app.viscera.services.edge_service import list_edges, update_edge

router = APIRouter()


@router.get("/edges", response_model=list[EdgeOut])
async def get_edges(
    _admin: AdminUser,
    source: str = Query("code", description="Architecture source ('code' | 'golden')"),
) -> list[EdgeOut]:
    """List all architecture edges from the source's ``edges/`` directory.

    Reads every ``*.yml`` file under ``architecture/{source}/edges/`` and
    returns them as a flat list.
    """
    validate_architecture_source(source)
    edges = list_edges(source=source)
    out: list[EdgeOut] = [
        EdgeOut(
            from_id=edge.get("from", ""),
            to_id=edge.get("to", ""),
            description=edge.get("description"),
            technology=edge.get("technology"),
            tags=edge.get("tags", []),
            scan_meta=edge.get("scan_meta"),
            status=edge.get("status"),
        )
        for edge in edges
    ]
    return out


@router.post("/edges", status_code=201, response_model=CreateEdgeResponse)
async def create_architecture_edge(
    body: CreateEdgeRequest,
    _admin: AdminUser,
    source: str = Query("code", description="Architecture source ('code' | 'golden')"),
) -> CreateEdgeResponse:
    """Create a new edge between two architecture objects.

    Both ``from_id`` and ``to_id`` must reference existing objects.
    The edge is written as the source's ``edges/{from}__{to}.yml``.
    """
    validate_architecture_source(source)
    try:
        edge = create_edge(body, source=source)
    except ValueError as exc:
        raise value_error_to_http(exc, not_found_status=422, conflict_status=409) from exc
    except FileNotFoundError as exc:
        raise file_not_found_to_http(exc) from exc

    return CreateEdgeResponse(success=True, edge=edge)


@router.put("/edges/{edge_id}", response_model=EdgeOut)
async def update_architecture_edge(
    edge_id: str,
    body: UpdateEdgeRequest,
    _admin: AdminUser,
    source: str = Query("code", description="Architecture source ('code' | 'golden')"),
) -> EdgeOut:
    """Update editable fields of an edge.

    The *edge_id* is a composite key ``"from__to"``
    (double-underscore separator). Only ``description``, ``technology``,
    and ``tags`` can be updated.
    """
    validate_architecture_source(source)
    try:
        update_data = body.model_dump(exclude_unset=True)
        updated = update_edge(edge_id, update_data, source=source)
    except ValueError as exc:
        raise value_error_to_http(exc) from exc

    return EdgeOut(
        from_id=updated.get("from", ""),
        to_id=updated.get("to", ""),
        description=updated.get("description"),
        technology=updated.get("technology"),
        tags=updated.get("tags", []),
        scan_meta=updated.get("scan_meta"),
        status=updated.get("status"),
    )


@router.delete("/edges/{edge_id}")
async def delete_architecture_edge(
    edge_id: str,
    _admin: AdminUser,
    source: str = Query("code", description="Architecture source ('code' | 'golden')"),
) -> dict[str, str]:
    """Delete an edge from the source's ``edges/`` directory.

    The *edge_id* is a composite key ``"from__to"``
    (double-underscore separator) identifying the edge.
    """
    validate_architecture_source(source)
    try:
        return delete_edge(edge_id, source=source)
    except ValueError as exc:
        raise value_error_to_http(exc) from exc
    except FileNotFoundError as exc:
        raise file_not_found_to_http(exc) from exc
