"""Architecture node (object) API endpoints.

CRUD + merge endpoints for architecture objects under
``architecture/{source}/nodes/``. Split out of ``architecture_router`` into one
focused endpoint module per resource (``check-file-length``); the parent router
only composes.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.shared.http.domain.error_mapping_rules import file_not_found_to_http, value_error_to_http
from app.shared.security.dependencies.auth_dependencies import AdminUser
from app.viscera.dependencies.viscera_dependencies import validate_architecture_source
from app.viscera.schemas.architecture_schemas import (
    CreateObjectRequest,
    CreateObjectResponse,
    ObjectFieldUpdateRequest,
    ObjectFieldUpdateResponse,
    ObjectListResponse,
    ObjectMergeRequest,
    ObjectMergeResponse,
)
from app.viscera.services.architecture_merge_service import merge_architecture
from app.viscera.services.architecture_objects_service import list_all_objects
from app.viscera.services.architecture_service import (
    create_object,
    delete_object_from_ist,
    update_object_field,
)

router = APIRouter()


@router.get("/nodes", response_model=ObjectListResponse)
async def list_objects(
    _admin: AdminUser,
    source: str = Query("code", description="Architecture source ('code' | 'golden')"),
) -> ObjectListResponse:
    """List all architecture objects from the source's ``nodes/`` directory.

    Reads every ``*.yml`` file under ``architecture/{source}/nodes/`` and
    returns them as a flat list.
    """
    validate_architecture_source(source)
    objects = list_all_objects(source=source)
    return ObjectListResponse(objects=objects)


@router.put("/nodes/{node_id}", response_model=ObjectFieldUpdateResponse)
async def update_object(
    node_id: str,
    body: ObjectFieldUpdateRequest,
    _admin: AdminUser,
    source: str = Query("code", description="Architecture source ('code' | 'golden')"),
) -> ObjectFieldUpdateResponse:
    """Update a single field of an architecture model object.

    Finds the object by ID across all YAML files under the source's
    ``architecture/`` tree, validates the new value, writes the file back,
    and returns the updated object.
    """
    validate_architecture_source(source)
    try:
        updated = update_object_field(node_id, body.field, body.value, source=source)
    except ValueError as exc:
        raise value_error_to_http(exc) from exc
    except FileNotFoundError as exc:
        raise file_not_found_to_http(exc) from exc

    return ObjectFieldUpdateResponse(success=True, object=updated)


@router.put("/nodes/{node_id}/merge", response_model=ObjectMergeResponse)
async def merge_object(
    node_id: str,
    body: ObjectMergeRequest,
    _admin: AdminUser,
    source: str = Query("code", description="Architecture source ('code' | 'golden')"),
) -> ObjectMergeResponse:
    """Merge an object into the architecture file.

    Accepts a fully merged object and writes it into the architecture YAML files
    of the given source.
    """
    validate_architecture_source(source)
    try:
        merged = merge_architecture(node_id, body.merged, source=source)
    except ValueError as exc:
        raise value_error_to_http(exc) from exc
    except FileNotFoundError as exc:
        raise file_not_found_to_http(exc) from exc

    return ObjectMergeResponse(success=True, object=merged)


@router.delete("/nodes/{node_id}")
async def delete_object(
    node_id: str,
    _admin: AdminUser,
    source: str = Query("code", description="Architecture source ('code' | 'golden')"),
) -> dict[str, str]:
    """Delete an object from the architecture file.

    Removes the object identified by *node_id* from the architecture YAML files
    of the given source. Top-level system objects cannot be deleted via this endpoint.
    """
    validate_architecture_source(source)
    try:
        return delete_object_from_ist(node_id, source=source)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/nodes", status_code=201, response_model=CreateObjectResponse)
async def create_architecture_object(
    body: CreateObjectRequest,
    _admin: AdminUser,
    source: str = Query("code", description="Architecture source ('code' | 'golden')"),
) -> CreateObjectResponse:
    """Create a new architecture object.

    Writes a new object with ``status: "viscera-approved"`` and ``scan_meta: null``
    as the source's ``nodes/{id}.yml``.
    The ``id`` must be unique across all existing object files.
    """
    validate_architecture_source(source)
    try:
        obj = create_object(body, source=source)
    except ValueError as exc:
        raise value_error_to_http(exc, not_found_status=422, conflict_status=409) from exc
    except FileNotFoundError as exc:
        raise file_not_found_to_http(exc) from exc

    return CreateObjectResponse(success=True, object=obj)
