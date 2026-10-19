"""FastAPI router for AIScope admin endpoints (composition only).

This module owns the ``admin_router`` registered under ``/api/v1/admin/fbf``
and composes the focused sub-routers that carry the actual endpoints:

project_freelancermap_router
    GET    /raw/freelancermap                    – List projects (paginated)
    GET    /raw/freelancermap/count              – Project count (optional filter)
    GET    /raw/freelancermap/{freelancermap_id} – Project detail
    DELETE /raw/freelancermap/{freelancermap_id} – Delete a project
    POST   /raw/freelancermap/{freelancermap_id}/reset-mapped – Set mapped_at to NULL
    POST   /project-freelancer-map/{freelancermap_id}/unlink – Detach from canonical
    POST   /project-freelancer-map/{freelancermap_id}/switch-canonical – Promote
    POST   /project-freelancer-map/{freelancermap_id}/set-canonical – Link/unlink
    POST   /project-freelancer-map/{freelancermap_id}/cousins – Similar projects

project_router
    GET    /projects                            – List normalised projects (paginated)
    GET    /projects/count                      – Count normalised projects
    POST   /projects                            – Create a master project
    GET    /projects/{project_id}/slaves        – Slave projects of a master
    GET    /projects/master-candidates          – Eligible new masters
    GET    /projects/slave-candidates           – Eligible new slaves
    GET    /projects/{project_id}               – Normalised project detail
    GET    /projects/{project_id}/siblings      – List neighbours
    PATCH  /projects/{project_id}/status        – Set exclusive status
    DELETE /projects/{project_id}               – Delete a normalised project

project_canonical_router
    POST   /projects/{project_id}/set-canonical      – Link/unlink as slave
    POST   /projects/{project_id}/transfer-references – Transfer old→new master refs

project_pipeline_router
    GET    /dedup/health                        – Postgres vector + dedup config
    POST   /projects/{project_id}/recalculate-score – Recompute one score
    POST   /projects/recalculate-scores         – Recompute all scores
    POST   /projects/backfill-skills            – Text-backfill missed skills
    POST   /projects/{project_id}/classify-skills – Extract skills + JobRole
    POST   /batch-dedup/run                     – Reset PM entries + delete projects

Further sub-routers (charts, scraper, endcustomer, rate, project-field, merge,
embedding) are included below.

Note on portals:
    Portals are managed exclusively via the admin_credential module.
SearchTerm (scraper search terms) endpoints live in the fbf search_term_router.
"""

from fastapi import APIRouter

from app.fbf.router.aiscope_charts_router import router as _aiscope_charts_router
from app.fbf.router.aiscope_embedding_router import router as _aiscope_embedding_router
from app.fbf.router.aiscope_endcustomer_router import router as _aiscope_endcustomer_router
from app.fbf.router.aiscope_merge_router import router as _aiscope_merge_router
from app.fbf.router.aiscope_project_canonical_router import router as _aiscope_project_canonical_router
from app.fbf.router.aiscope_project_field_router import router as _aiscope_project_field_router
from app.fbf.router.aiscope_project_freelancermap_router import router as _aiscope_project_freelancermap_router
from app.fbf.router.aiscope_project_maintenance_router import router as _aiscope_project_maintenance_router
from app.fbf.router.aiscope_project_router import router as _aiscope_project_router
from app.fbf.router.aiscope_rate_router import router as _aiscope_rate_router
from app.fbf.router.aiscope_scraper_router import router as _aiscope_scraper_router

admin_router = APIRouter()


# ── ProjectFreelancermap + Project-Endpunkte (Admin) ─────────────────────────


admin_router.include_router(_aiscope_project_freelancermap_router)
admin_router.include_router(_aiscope_project_router)
admin_router.include_router(_aiscope_project_canonical_router)
admin_router.include_router(_aiscope_project_maintenance_router)


# ── Sub-Router (Admin) ────────────────────────────────────────────────────────


admin_router.include_router(_aiscope_charts_router)
admin_router.include_router(_aiscope_scraper_router)
admin_router.include_router(_aiscope_endcustomer_router)
admin_router.include_router(_aiscope_rate_router)
admin_router.include_router(_aiscope_project_field_router)
admin_router.include_router(_aiscope_merge_router)
admin_router.include_router(_aiscope_embedding_router)
