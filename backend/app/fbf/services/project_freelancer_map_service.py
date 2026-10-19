"""Business logic for ProjectFreelancerMap (AIScope domain)."""

import datetime

import structlog
from fastapi import HTTPException, status

from app.fbf.repositories import project_freelancer_map_repository, project_repository
from app.fbf.repositories.project_freelancer_map_repository import ProjectFreelancerMapFilter
from app.fbf.repositories.project_repository import ProjectRow
from app.fbf.schemas.dedup_schemas import (
    CousinProjectOut,
    CousinsResponse,
    SetCanonicalResponse,
    SwitchCanonicalResponse,
    UnlinkResponse,
)
from app.fbf.schemas.project_freelancer_map_schemas import ProjectFreelancerMapOut
from app.fbf.schemas.project_schemas import ProjectOut
from app.shared.db_access.session_types import AsyncSession
from app.shared.embedding.infrastructure.embedding_client import EmbeddingClient

logger = structlog.get_logger(__name__)

_COUSINS_LIMIT: int = 10  # Maximum number of cousin projects to return


async def list_all(
    db: AsyncSession,
    filters: ProjectFreelancerMapFilter,
    *,
    offset: int = 0,
    limit: int = 50,
    sort_by: str = "posted_at",
    sort_order: str = "desc",
) -> list[ProjectFreelancerMapOut]:
    """Returns paginated projects.

    Supports optional full-text search and search-term filter.

    Args:
        db: Database connection.
        filters: Filter parameters (search text, SearchTerm FK).
        offset: Page offset.
        limit: Maximum result count.
        sort_by: Column name for sorting (default=posted_at).
        sort_order: Sort direction – ``asc`` or ``desc`` (default=desc).

    Returns:
        List of ProjectFreelancerMap DTOs sorted by
        ``sort_by``/``sort_order``.
    """
    return await project_freelancer_map_repository.get_all(
        db,
        filters,
        offset=offset,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
    )


async def get_by_id(db: AsyncSession, project_id: int) -> ProjectFreelancerMapOut:
    """Returns a project by ID.

    Args:
        db: Database connection.
        project_id: Primary key.

    Returns:
        ProjectFreelancerMap DTO.

    Raises:
        HTTPException 404: Project not found.
    """
    project = await project_freelancer_map_repository.get_by_id(db, project_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ProjectFreelancerMap {project_id} not found.",
        )
    return project


async def count(db: AsyncSession, filters: ProjectFreelancerMapFilter) -> int:
    """Returns the total number of projects (with optional filter).

    Args:
        db: Database connection.
        filters: Filter parameters (search text, SearchTerm FK).

    Returns:
        Number of matching projects.
    """
    return await project_freelancer_map_repository.count(db, filters)


async def delete(db: AsyncSession, project_id: int) -> None:
    """Permanently deletes a project.

    Args:
        db: Database connection.
        project_id: Primary key.

    Raises:
        HTTPException 404: Project not found.
    """
    if not await project_freelancer_map_repository.delete(db, project_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ProjectFreelancerMap {project_id} not found.",
        )
    logger.info("ProjectFreelancerMap deleted: id=%s", project_id)


async def find_slave_candidates(
    db: AsyncSession,
    *,
    q: str | None = None,
    exclude_canonical_id: int,
    limit: int = 7,
) -> list[ProjectRow]:
    """Returns projects eligible as slaves for a given master.

    Candidates must not already belong to the exclude_canonical_id master, have
    no children of their own (slave_count = 0) and not be the master itself.

    Args:
        db: Database connection.
        q: Search term (matches id prefix + title).
        exclude_canonical_id: ID of the master to exclude from candidates.
        limit: Maximum number of results.

    Returns:
        List of ``ProjectRow`` read-models (project DTO + projected ``slave_count``).
    """
    return await project_repository.find_slave_candidates(
        db,
        q=q,
        exclude_canonical_id=exclude_canonical_id,
        limit=limit,
    )


async def find_master_candidates(
    db: AsyncSession,
    *,
    q: str | None = None,
    exclude_id: int,
    exclude_current_master_id: int,
    limit: int = 7,
) -> list[ProjectOut]:
    """Returns Master projects eligible to become the new master for a slave.

    Candidates must be a Master (``canonical_id IS NULL``), not be the slave
    itself and not be the current master.

    Args:
        db: Database connection.
        q: Search term (matches id prefix + title).
        exclude_id: ID of the slave to exclude.
        exclude_current_master_id: ID of the current master to exclude.
        limit: Maximum number of results.

    Returns:
        List of eligible Master Project DTOs.
    """
    return await project_repository.find_master_candidates(
        db,
        q=q,
        exclude_id=exclude_id,
        exclude_current_master_id=exclude_current_master_id,
        limit=limit,
    )


async def set_project_canonical(
    db: AsyncSession,
    project_id: int,
    canonical_project_id: int | None,
) -> SetCanonicalResponse:
    """Link or unlink a project as slave, operating purely on ``project``.

    Master/slave grouping lives entirely in ``project.canonical_id`` – the
    freelancermap table is only used during scraping/mapping and is never
    touched here. Projects are never deleted: unlinking a slave promotes it to
    a standalone master; the former master simply loses a member.

    Args:
        db: Database connection.
        project_id: ID of the project to link/unlink.
        canonical_project_id: Target master project ID, or ``None`` to unlink.

    Returns:
        SetCanonicalResponse with status, project IDs and the re-pointed slaves.

    Raises:
        HTTPException 404: Project or target master not found.
        HTTPException 400: A project cannot be its own master.
        HTTPException 400: Target project is not a master (``canonical_id`` set).
    """
    project = await project_repository.get_out_by_id(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found.")

    if canonical_project_id is not None:
        if canonical_project_id == project_id:
            raise HTTPException(status_code=400, detail="A project cannot be its own master.")
        master = await project_repository.get_out_by_id(db, canonical_project_id)
        if master is None:
            raise HTTPException(status_code=404, detail=f"Master project {canonical_project_id} not found.")
        if master.canonical_id is not None:
            raise HTTPException(status_code=400, detail="Target project is not a master.")

    status_str, repointed_slave_ids = await project_repository.set_canonical_grouping(
        db, project_id, canonical_project_id
    )
    logger.info(
        "Project %s %s (canonical_id=%s, repointed=%s)",
        project_id,
        status_str,
        canonical_project_id,
        repointed_slave_ids,
    )
    return SetCanonicalResponse(
        status=status_str,
        project_id=project_id,
        canonical_project_id=canonical_project_id,
        repointed_slave_ids=repointed_slave_ids,
    )


async def unlink(db: AsyncSession, freelancermap_id: int) -> UnlinkResponse:
    """Detaches a Freelancermap entry from its canonical Project.

    Finds the Project for this PM via URL, sets its ``canonical_id = None``
    (promotes to Master), and resets ``mapped_at`` so the mapper reprocesses it.

    Args:
        db: Database connection.
        freelancermap_id: Primary key of the ProjectFreelancerMap entry.

    Returns:
        UnlinkResponse with status and freelancermap_id.

    Raises:
        HTTPException 404: Freelancermap entry not found.
        HTTPException 400: Freelancermap entry already not linked to a master via project.
    """
    freelancermapEntry = await project_freelancer_map_repository.get_by_id(db, freelancermap_id)
    if freelancermapEntry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ProjectFreelancerMap {freelancermap_id} not found.",
        )

    project = await project_repository.get_by_url_out(db, freelancermapEntry.url)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ProjectFreelancerMap {freelancermap_id} has no mapped project yet.",
        )
    if project.canonical_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ProjectFreelancerMap {freelancermap_id} is already a master – nothing to unlink.",
        )

    await project_repository.unlink_project(db, project.id)
    await project_freelancer_map_repository.set_mapped_at(db, freelancermap_id, None)
    await db.commit()
    logger.info("ProjectFreelancerMap unlinked: freelancermap_id=%s, project_id=%s", freelancermap_id, project.id)
    return UnlinkResponse(status="unlinked", freelancermap_id=freelancermap_id)


async def switch_canonical(db: AsyncSession, freelancermap_id: int) -> SwitchCanonicalResponse:
    """Promotes a Freelancermap entry's slave Project to become the new Master.

    Finds the slave Project for this PM via URL, promotes it to Master
    (``canonical_id = None``, ``similarity_score = 1.0``), degrades the
    old Master to a slave, and reassigns all other slave Projects and
    junction entries. The old Master is not deleted — it becomes a slave.

    Args:
        db: Database connection.
        freelancermap_id: Primary key of the ProjectFreelancerMap entry to promote.

    Returns:
        SwitchCanonicalResponse with status, old and new project IDs.

    Raises:
        HTTPException 404: Freelancermap entry not found.
        HTTPException 404: Mapped Project or old Master not found.
        HTTPException 400: Freelancermap entry has no slave project or is already master.
    """
    freelancermapEntry = await project_freelancer_map_repository.get_by_id(db, freelancermap_id)
    if freelancermapEntry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ProjectFreelancerMap {freelancermap_id} not found.",
        )

    slave_project = await project_repository.get_by_url_out(db, freelancermapEntry.url)
    if slave_project is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ProjectFreelancerMap {freelancermap_id} has no mapped project yet.",
        )
    if slave_project.canonical_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ProjectFreelancerMap {freelancermap_id} is already a master project.",
        )

    try:
        old_master_id, promoted_project_id = await project_repository.switch_canonical_grouping(db, slave_project.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    await project_freelancer_map_repository.set_mapped_at(db, freelancermap_id, datetime.datetime.now(datetime.UTC))
    await db.commit()
    logger.info(
        "Switched canonical: old_project_id=%s -> new_project_id=%s (freelancermap_id=%s)",
        old_master_id,
        promoted_project_id,
        freelancermap_id,
    )
    return SwitchCanonicalResponse(
        status="switched",
        old_project_id=old_master_id,
        new_project_id=promoted_project_id,
    )


async def set_canonical(
    db: AsyncSession,
    freelancermap_id: int,
    canonical_project_id: int | None,
) -> SetCanonicalResponse:
    """Manually link a Freelancermap entry's Project to a master Project or unlink it.

    Operates on ``project.canonical_id`` (self-referencing FK) instead of the
    removed ``project_freelancer_map.canonical_project_id`` cross-table column.
    Sets ``freelancermapEntry.mapped_at = now()`` so the mapper permanently
    skips this entry.

    Args:
        db: Database connection.
        freelancermap_id: Primary key of the ProjectFreelancerMap entry.
        canonical_project_id: Target master Project ID (None to unlink/master).

    Returns:
        SetCanonicalResponse with status and freelancermap_id.

    Raises:
        HTTPException 404: Freelancermap entry not found.
        HTTPException 404: Target canonical Project not found.
    """
    freelancermapEntry = await project_freelancer_map_repository.get_by_id(db, freelancermap_id)
    if freelancermapEntry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ProjectFreelancerMap {freelancermap_id} not found.",
        )

    project = await project_repository.get_by_url_out(db, freelancermapEntry.url)
    now_utc = datetime.datetime.now(datetime.UTC)

    if canonical_project_id is None:
        old_master_id: int | None = None
        if project is not None:
            old_master_id = await project_repository.set_canonical_link(db, project.id, None)
        await project_freelancer_map_repository.set_mapped_at(db, freelancermap_id, now_utc)
        await db.flush()

        if old_master_id is not None:
            await project_repository.cleanup_old_master(db, old_master_id)

        await db.commit()
        logger.info("ProjectFreelancerMap unlinked via set-canonical: freelancermap_id=%s", freelancermap_id)
        return SetCanonicalResponse(
            status="unlinked",
            freelancermap_id=freelancermap_id,
            canonical_project_id=None,
        )

    master = await project_repository.get_out_by_id(db, canonical_project_id)
    if master is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {canonical_project_id} not found.",
        )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ProjectFreelancerMap {freelancermap_id} has no mapped project yet.",
        )

    old_master_id = await project_repository.set_canonical_link(db, project.id, canonical_project_id)
    await project_freelancer_map_repository.set_mapped_at(db, freelancermap_id, now_utc)
    await db.flush()

    if old_master_id is not None and old_master_id != canonical_project_id:
        await project_repository.cleanup_old_master(db, old_master_id)

    await db.commit()
    logger.info(
        "ProjectFreelancerMap linked via set-canonical: freelancermap_id=%s → project_id=%s",
        freelancermap_id,
        canonical_project_id,
    )
    return SetCanonicalResponse(
        status="linked",
        freelancermap_id=freelancermap_id,
        canonical_project_id=canonical_project_id,
    )


async def get_cousins(
    db: AsyncSession,
    freelancermap_id: int,
    *,
    embedding_client: EmbeddingClient,
) -> CousinsResponse:
    """Returns the top-10 semantically similar canonical Projects for a Freelancermap entry.

    Builds embedding text from the PM's title and city, computes cosine
    similarity against every Master-Project's ``project.vector`` (Postgres),
    and returns the closest 10 Projects (excluding the PM's current canonical
    Project).

    Args:
        db: Database connection.
        freelancermap_id: Primary key of the ProjectFreelancerMap entry.

    Returns:
        CousinsResponse with freelancermap_id and list of CousinProjectOut entries.

    Raises:
        HTTPException 404: Freelancermap entry not found.
    """
    from app.fbf.services.dedup_service import rank_masters_by_similarity

    freelancermapEntry = await project_freelancer_map_repository.get_by_id(db, freelancermap_id)
    if freelancermapEntry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ProjectFreelancerMap {freelancermap_id} not found.",
        )

    # Build embedding text from title + city
    parts: list[str] = []
    if freelancermapEntry.title:
        parts.append(f"title: {freelancermapEntry.title}")
    if freelancermapEntry.city:
        parts.append(f"city: {freelancermapEntry.city}")
    embedding_text = "\n".join(parts)

    # Generate embedding vector (core-DB session via the repository seam)
    async with project_repository.open_core_session() as core_db:
        vector = await embedding_client.embed_text(embedding_text, core_db)

    # Compute cosine similarity against all Master-Project vectors (Postgres)
    freelancermapEntry_project = await project_repository.get_by_url_out(db, freelancermapEntry.url)
    current_canonical: int | None = None
    if freelancermapEntry_project is not None:
        proj = freelancermapEntry_project
        current_canonical = proj.id if proj.canonical_id is None else proj.canonical_id

    masters = await project_repository.get_master_vector_refs(db)
    ranked = rank_masters_by_similarity(vector, masters)

    # Build response – filter out current canonical, limit to top 10
    cousin_projects: list[CousinProjectOut] = []
    for project, similarity in ranked:
        if project.id == current_canonical:
            continue

        cousin_projects.append(
            CousinProjectOut(
                project_id=project.id,
                title=project.title,
                city=project.city,
                similarity=round(similarity, 4),
            )
        )

        if len(cousin_projects) >= _COUSINS_LIMIT:
            break

    logger.info("get_cousins: %d cousins found for freelancermap_id=%d", len(cousin_projects), freelancermap_id)
    return CousinsResponse(freelancermap_id=freelancermap_id, cousins=cousin_projects)
