"""FastAPI router for FBF skill dedup board endpoints (gjo_se_com).

Admin (mounted unter /api/v1/admin/fbf via router.py):
    GET   /dedup/board            – Paginierte Board-Ansicht fuer Dedup-Review
    GET   /dedup/candidates       – Top-20 Kandidaten fuer einen Master (Vector-Similarity)
    GET   /dedup/suggestions      – Top-20 Master-Vorschlaege fuer einen Slave (Vector-Similarity)
    POST  /dedup/similar-masters  – Master mit Slaves nach Aehnlichkeit zur Auswahl sortieren
    POST  /dedup/embed            – Embeddings fuer alle Skills berechnen
    POST  /dedup/assign           – Slave einem Master zuordnen
    POST  /dedup/activate         – Master + Slaves auf confirmed setzen
    POST  /dedup/archive          – Skills auf deprecated setzen
    POST  /dedup/unassign         – canonical_id auf NULL setzen
    POST  /dedup/bulk             – Bulk-Mutation (assign/activate/deprecated/unassign/pending/active/rejected)
    POST  /dedup/dissolve         – Master-Gruppe aufloesen (alle canonical_id=NULL + status=pending)
"""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.fbf.schemas.dedup_schemas import (
    ActionResultOut,
    ActivateRequest,
    ArchiveRequest,
    AssignRequest,
    BoardPageOut,
    BulkActionRequest,
    DissolveGroupRequest,
    SimilarMasterItemOut,
    SimilarMastersOut,
    SimilarMastersRequest,
    SimilarSkillOut,
    UnassignRequest,
)
from app.fbf.services import skill_dedup_service
from app.shared.db_access.session import AsyncSessionLocal as CoreAsyncSessionLocal
from app.shared.db_access.session import get_gjo_se_db
from app.shared.embedding.dependencies.embedding_dependencies import get_embedding_client
from app.shared.embedding.infrastructure.embedding_client import EmbeddingClient
from app.shared.security.dependencies.auth_dependencies import AdminUser

router = APIRouter()


@router.get(
    "/dedup/board",
    response_model=BoardPageOut,
    summary="Paginated board view for dedup review (Admin)",
)
async def get_board_page(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    column: Literal["masters", "slaves"] = Query(description="Column to fetch: masters or slaves"),
    q: str | None = Query(default=None, description="Search term for name"),
    status_filter: str | None = Query(default=None, alias="status", description="Status filter"),
    master_id: int | None = Query(default=None, description="Filter slaves by canonical master ID"),
    has_slaves: bool | None = Query(
        default=None,
        description="For column=masters: true = masters with slaves, false = masters without slaves",
    ),
    sort_by: str = Query(default="name", description="Sort field: name, status, alias_count"),
    sort_order: str = Query(default="asc", pattern="^(asc|desc)$", description="Sort direction"),
    page: int = Query(default=0, ge=0),
    size: int = Query(default=20, ge=1, le=100),
) -> BoardPageOut:
    """Paginated board view: masters (canonical_id IS NULL) or slaves.

    Returns skills with alias_count, master_name, and progress metadata.

    ``column`` is constrained via ``Literal`` so FastAPI rejects unknown values
    with its standard 422 body (``detail`` as a validation-error array).
    """
    result = await skill_dedup_service.get_board_page(
        db,
        column=column,
        q=q,
        status=status_filter,
        master_id=master_id,
        has_slaves=has_slaves,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        size=size,
    )
    return BoardPageOut(**result)


@router.get(
    "/dedup/candidates",
    response_model=list[SimilarSkillOut],
    summary="Top-20 unassigned skills by vector similarity to a master (Admin)",
)
async def get_candidates(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    master_id: int = Query(description="ID of the master skill"),
) -> list[SimilarSkillOut]:
    """Return top-20 unassigned skills ranked by cosine similarity to *master_id*.

    Candidates are skills whose ``canonical_id IS NULL``, are not deprecated,
    and have an embedding vector.  The master itself is excluded.
    """
    try:
        items = await skill_dedup_service.get_candidates(db, master_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return [SimilarSkillOut(**item) for item in items]


@router.get(
    "/dedup/suggestions",
    response_model=list[SimilarSkillOut],
    summary="Top-20 master skills by vector similarity to a slave (Admin)",
)
async def get_suggestions(
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
    slave_id: int = Query(description="ID of the slave skill"),
) -> list[SimilarSkillOut]:
    """Return top-20 master skills ranked by cosine similarity to *slave_id*.

    Masters are skills whose ``canonical_id IS NULL`` and that are not deprecated.
    """
    try:
        items = await skill_dedup_service.get_suggestions(db, slave_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return [SimilarSkillOut(**item) for item in items]


@router.post(
    "/dedup/similar-masters",
    response_model=SimilarMastersOut,
    summary="Masters sorted by similarity to a single reference skill (Admin)",
)
async def get_similar_masters(
    request: SimilarMastersRequest,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> SimilarMastersOut:
    """Rank masters by similarity to a single reference skill.

    Base set via ``has_slaves``: None = mixed (column 2), False = masters
    without slaves (column-1 neighbors). Toolbar filters (*q* / *status*)
    stay additive filters; similarity is the sort order. The reference
    skill itself and masters without vectors are excluded.

    For masters with slaves: similarity = max cosine across master + all slaves.
    """
    try:
        items = await skill_dedup_service.get_similar_masters(
            db,
            skill_ids=request.skill_ids,
            q=request.q,
            status=request.status,
            has_slaves=request.has_slaves,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return SimilarMastersOut(items=[SimilarMasterItemOut(**item) for item in items])


class EmbedResponse(BaseModel):
    """Response after triggering embedding computation."""

    embedded: int


@router.post(
    "/dedup/embed",
    response_model=EmbedResponse,
    summary="Compute embeddings for all skills (Admin)",
)
async def compute_embeddings(
    _: AdminUser,
    gjo_db: AsyncSession = Depends(get_gjo_se_db),
    embedding_client: EmbeddingClient = Depends(get_embedding_client),
) -> EmbedResponse:
    """Compute embeddings for all skills without a vector.

    This may take a while for large skill sets.
    Uses core_db internally for OpenRouter credential lookup.
    """
    async with CoreAsyncSessionLocal() as core_db:
        count = await skill_dedup_service.compute_embeddings(gjo_db, core_db, embedding_client=embedding_client)
    await gjo_db.commit()
    return EmbedResponse(embedded=count)


# ── Board Mutations (assign / activate / archive / unassign) ────────────────


@router.post(
    "/dedup/assign",
    response_model=ActionResultOut,
    summary="Assign a slave to a master (Admin)",
)
async def assign_slave(
    body: AssignRequest,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ActionResultOut:
    """Set ``canonical_id`` on a slave skill to link it to a master.

    Validates: skill and master exist, no self-assign, master is not a slave.
    """
    try:
        result = await skill_dedup_service.assign_slave(
            db,
            skill_id=body.skill_id,
            master_id=body.master_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    await db.commit()
    return ActionResultOut(**result)


@router.post(
    "/dedup/activate",
    response_model=ActionResultOut,
    summary="Activate a master + verified slaves (Admin)",
)
async def activate_master(
    body: ActivateRequest,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ActionResultOut:
    """Set status to ``confirmed`` for a master and its verified slaves."""
    try:
        result = await skill_dedup_service.activate_master(
            db,
            master_id=body.master_id,
            slave_ids=body.slave_ids,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    await db.commit()
    return ActionResultOut(**result)


@router.post(
    "/dedup/archive",
    response_model=ActionResultOut,
    summary="Archive one or more skills (Admin)",
)
async def archive_skills(
    body: ArchiveRequest,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ActionResultOut:
    """Set status to ``deprecated`` for the given skills (reversible)."""
    try:
        result = await skill_dedup_service.archive_skills(db, skill_ids=body.skill_ids)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    await db.commit()
    return ActionResultOut(**result)


@router.post(
    "/dedup/unassign",
    response_model=ActionResultOut,
    summary="Remove master assignment (Admin)",
)
async def unassign_skills(
    body: UnassignRequest,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ActionResultOut:
    """Set ``canonical_id=NULL`` for the given skills."""
    try:
        result = await skill_dedup_service.unassign_skills(db, skill_ids=body.skill_ids)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    await db.commit()
    return ActionResultOut(**result)


@router.post(
    "/dedup/bulk",
    response_model=ActionResultOut,
    summary="Bulk mutation: assign/activate/archive/unassign/pending/confirmed (Admin)",
)
async def bulk_action(
    body: BulkActionRequest,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ActionResultOut:
    """Apply a single action to multiple skills atomically.

    All validation runs up-front; if anything is invalid the entire
    request is rejected (no partial commit).
    """
    try:
        result = await skill_dedup_service.bulk_action(
            db,
            action=body.action,
            skill_ids=body.skill_ids,
            master_id=body.master_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    await db.commit()
    return ActionResultOut(**result)


@router.post(
    "/dedup/dissolve",
    response_model=ActionResultOut,
    summary="Dissolve a master group: unassign all slaves + set pending (Admin)",
)
async def dissolve_group(
    body: DissolveGroupRequest,
    _: AdminUser,
    db: AsyncSession = Depends(get_gjo_se_db),
) -> ActionResultOut:
    """Dissolve a master group completely.

    Sets ``canonical_id=NULL`` for all slaves of the given master and
    ``status=pending`` for the master AND all its former slaves.  Every
    card re-appears as an independent master without slaves.
    """
    try:
        result = await skill_dedup_service.dissolve_group(db, master_id=body.master_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    await db.commit()
    return ActionResultOut(**result)
