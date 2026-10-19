"""Architecture group API endpoints.

CRUD + member endpoints for the groups under ``architecture/{source}/groups/``.
Split out of ``architecture_router`` into one focused endpoint module per
resource (``check-file-length``); the parent router only composes.
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.shared.http.domain.error_mapping_rules import value_error_to_http
from app.shared.security.dependencies.auth_dependencies import AdminUser
from app.viscera.dependencies.viscera_dependencies import validate_architecture_source
from app.viscera.schemas.architecture_schemas import (
    CreateGroupRequest,
    GroupResponse,
    UpdateGroupMembersRequest,
    UpdateGroupRequest,
)
from app.viscera.services.group_service import (
    create_group,
    delete_group,
    list_groups,
    update_group,
    update_group_members,
)

router = APIRouter()


@router.get("/groups", response_model=list[GroupResponse])
async def get_groups(
    _admin: AdminUser,
    source: str = Query("code", description="Architecture source ('code' | 'golden')"),
) -> list[GroupResponse]:
    """List all architecture groups from the source's ``groups/`` directory.

    Reads all ``*.yml`` files from ``architecture/{source}/groups/``
    and returns them as a flat list of GroupResponse objects.
    """
    validate_architecture_source(source)
    return list_groups(source=source)


@router.post("/groups", status_code=201, response_model=GroupResponse)
async def create_architecture_group(
    body: CreateGroupRequest,
    _admin: AdminUser,
    source: str = Query("code", description="Architecture source ('code' | 'golden')"),
) -> GroupResponse:
    """Create a new architecture group.

    Writes the source's ``groups/{id}.yml`` with the group definition.
    The id must not collide with an existing node id.
    """
    validate_architecture_source(source)
    try:
        return create_group(body, source=source)
    except ValueError as exc:
        raise value_error_to_http(
            exc,
            not_found_status=422,
            conflict_status=409,
            conflict_markers=("already exists", "conflicts"),
        ) from exc


@router.put("/groups/{group_id}", response_model=GroupResponse)
async def update_architecture_group(
    group_id: str,
    body: UpdateGroupRequest,
    _admin: AdminUser,
    source: str = Query("code", description="Architecture source ('code' | 'golden')"),
) -> GroupResponse:
    """Update a group's metadata fields.

    Merges non-None fields from the request body into the group YAML.
    Only ``name`` and ``description`` can be updated.
    """
    validate_architecture_source(source)
    try:
        return update_group(group_id, body, source=source)
    except ValueError as exc:
        raise value_error_to_http(exc) from exc


@router.delete("/groups/{group_id}")
async def delete_architecture_group(
    group_id: str,
    _admin: AdminUser,
    source: str = Query("code", description="Architecture source ('code' | 'golden')"),
) -> dict[str, str]:
    """Delete a group.

    Removes the source's ``groups/{id}.yml`` from disk.
    Member nodes are intentionally not touched.
    """
    validate_architecture_source(source)
    try:
        return delete_group(group_id, source=source)
    except ValueError as exc:
        raise value_error_to_http(exc) from exc


@router.put("/groups/{group_id}/members", response_model=GroupResponse)
async def update_group_members_endpoint(
    group_id: str,
    body: UpdateGroupMembersRequest,
    _admin: AdminUser,
    source: str = Query("code", description="Architecture source ('code' | 'golden')"),
) -> GroupResponse:
    """Update the ``members`` list of a group.

    Patches the ``members`` array by adding and/or removing node IDs.
    Added members must exist as nodes and must not be group ids.
    """
    validate_architecture_source(source)
    try:
        return update_group_members(group_id, body, source=source)
    except ValueError as exc:
        raise value_error_to_http(exc) from exc
