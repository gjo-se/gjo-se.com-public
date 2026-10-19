"""Architecture API router (composition only).

Owns the ``router`` mounted under ``/api/v1/admin/viscera`` and composes the
focused per-resource endpoint modules that carry the actual endpoints:

nodes_router
    GET    /nodes                        – List architecture objects
    POST   /nodes                        – Create an object
    PUT    /nodes/{node_id}              – Update a single object field
    PUT    /nodes/{node_id}/merge        – Merge an object into its IST file
    DELETE /nodes/{node_id}              – Delete an object

edges_router
    GET    /edges                        – List edges
    POST   /edges                        – Create an edge
    PUT    /edges/{edge_id}              – Update edge fields
    DELETE /edges/{edge_id}              – Delete an edge

diagrams_router
    GET    /diagrams                     – List diagrams
    POST   /diagrams                     – Create a diagram
    PUT    /diagrams/{key}               – Update diagram metadata
    DELETE /diagrams/{key}               – Delete a diagram
    PUT    /diagrams/{key}/nodes/{node_id} – Set a single node position
    PUT    /diagrams/{key}/nodes         – Batch-update node positions

groups_router
    GET    /groups                       – List groups
    POST   /groups                       – Create a group
    PUT    /groups/{group_id}            – Update group metadata
    DELETE /groups/{group_id}            – Delete a group
    PUT    /groups/{group_id}/members    – Patch group members

meta_router
    GET    /mtimes                       – File modification times (freshness)
    GET    /imports                      – Canonical L4 module list

The consumer import (``from app.viscera.router.architecture_router import router``)
stays stable; only the endpoint bodies moved into the per-resource modules.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.viscera.router.architecture_diagrams_router import router as _architecture_diagrams_router
from app.viscera.router.architecture_edges_router import router as _architecture_edges_router
from app.viscera.router.architecture_groups_router import router as _architecture_groups_router
from app.viscera.router.architecture_meta_router import router as _architecture_meta_router
from app.viscera.router.architecture_nodes_router import router as _architecture_nodes_router

router = APIRouter()

router.include_router(_architecture_nodes_router)
router.include_router(_architecture_edges_router)
router.include_router(_architecture_diagrams_router)
router.include_router(_architecture_groups_router)
router.include_router(_architecture_meta_router)
