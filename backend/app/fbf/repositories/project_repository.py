"""Database access facade for normalised Project entries (AIScope domain).

The former god-file was split into focused modules – filter builders
(``project_filter_repository``), sort builders (``project_sort_repository``),
read-model (``project_read_model_repository``), reads + owner-side selects
(``project_read_repository``), single-project mutations
(``project_mutation_repository``), status transitions
(``project_status_repository``), canonical grouping
(``project_canonical_repository``), analytics
(``project_analytics_repository``) and the master-vector projection
(``project_vector_repository``). This module re-exports their public surface
so consumers keep importing ``app.fbf.repositories.project_repository``
unchanged, and owns the session seams (Composition Root).

``_to_out`` stays importable here because ``project_write_repository`` imports
it from this historical path.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.repositories.project_analytics_repository import (
    MonthlyProjectRow,
    get_master_confirmed_scores_since,
    get_monthly_project_counts,
)
from app.fbf.repositories.project_canonical_repository import (
    cleanup_old_master,
    find_master_candidates,
    find_slave_candidates,
    set_canonical_grouping,
    set_canonical_link,
    switch_canonical_grouping,
    unlink_project,
)
from app.fbf.repositories.project_filter_repository import ProjectFilter
from app.fbf.repositories.project_mutation_repository import (
    create_master,
    create_slave,
    delete_by_id,
    reassign_job_role,
    set_endcustomer,
    set_job_role,
    set_merged_fields,
    set_scores,
    set_vector,
)
from app.fbf.repositories.project_read_model_repository import ProjectRow, _to_out
from app.fbf.repositories.project_read_repository import (
    count,
    count_by_job_role,
    count_by_job_role_ids,
    exists,
    get_all,
    get_all_ids,
    get_by_id,
    get_by_url,
    get_by_url_out,
    get_detail,
    get_masters_with_merged_description,
    get_neighbors,
    get_out_by_id,
    get_projects_without_vector,
    get_slaves,
    get_slaves_out,
    get_slaves_rows,
    get_titles,
    master_project_ids_for_job_role_select,
    master_project_ids_select,
    master_projects_posted_at_select,
    project_title_select,
)
from app.fbf.repositories.project_status_repository import (
    ARCHIVE_AGE_DAYS,
    archive_stale_projects,
    set_status,
)
from app.fbf.repositories.project_vector_repository import (
    ProjectVectorRef,
    get_master_vector_refs,
)
from app.shared.db_access.session import AsyncSessionLocal

__all__ = [
    "ARCHIVE_AGE_DAYS",
    "MonthlyProjectRow",
    "ProjectFilter",
    "ProjectRow",
    "ProjectVectorRef",
    "_to_out",
    "archive_stale_projects",
    "cleanup_old_master",
    "count",
    "count_by_job_role",
    "count_by_job_role_ids",
    "create_master",
    "create_slave",
    "delete_by_id",
    "exists",
    "find_master_candidates",
    "find_slave_candidates",
    "get_all",
    "get_all_ids",
    "get_by_id",
    "get_by_url",
    "get_by_url_out",
    "get_detail",
    "get_master_confirmed_scores_since",
    "get_master_vector_refs",
    "get_masters_with_merged_description",
    "get_monthly_project_counts",
    "get_neighbors",
    "get_out_by_id",
    "get_projects_without_vector",
    "get_slaves",
    "get_slaves_out",
    "get_slaves_rows",
    "get_titles",
    "master_project_ids_for_job_role_select",
    "master_project_ids_select",
    "master_projects_posted_at_select",
    "open_core_session",
    "open_session",
    "project_title_select",
    "reassign_job_role",
    "set_canonical_grouping",
    "set_canonical_link",
    "set_endcustomer",
    "set_job_role",
    "set_merged_fields",
    "set_scores",
    "set_status",
    "set_vector",
    "switch_canonical_grouping",
    "unlink_project",
]


def open_session() -> AsyncSession:
    """Return a new session bound to the application database.

    Composition seam for services that must run an isolated unit of work
    (e.g. the description-merge/skill-extraction graph): the service must not
    import the session factory itself (K3), so the repository exposes it.

    Returns:
        A fresh ``AsyncSession`` bound to the application engine.
    """
    return AsyncSessionLocal()


def open_core_session() -> AsyncSession:
    """Return a new core-DB session (composition seam for services).

    Services must not open their own session (K3); a repository that needs an
    isolated session (e.g. LLM credential lookup) exposes this factory instead.

    Returns:
        A fresh ``AsyncSession`` bound to the core database.
    """
    return AsyncSessionLocal()
