"""Pydantic schemas for FBF dedup (board, actions, responses)."""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SimilarSkillOut(BaseModel):
    """A skill with its cosine-similarity to a reference vector."""

    id: int
    name: str
    status: str
    similarity: float


# ── Board ───────────────────────────────────────────────────────────────────


class BoardItemOut(BaseModel):
    """Single skill item for the dedup board (master or slave)."""

    id: int
    name: str
    description: str | None = None
    status: str
    canonical_id: int | None = None
    master_name: str | None = None
    alias_count: int = 0
    importance: int | None = None
    level: int | None = None
    level_public: int | None = None


class BoardPageOut(BaseModel):
    """Paginated page of board items with progress metadata."""

    items: list[BoardItemOut]
    total: int
    page: int
    size: int
    checked_masters: int = 0
    total_masters: int = 0


class SimilarMastersRequest(BaseModel):
    """Single reference skill to rank similarity neighbors against.

    ``has_slaves``: None = all masters (mixed list, column 2),
    False = masters without slaves only (column-1 neighbors),
    True = masters with slaves only.
    """

    skill_ids: list[int] = Field(min_length=1, max_length=1)
    q: str | None = None
    status: str | None = None
    has_slaves: bool | None = None


class SimilarMasterItemOut(BoardItemOut):
    """Board item enriched with cosine similarity to the selection centroid.

    For group-refined masters (master score above the bridge threshold)
    ``similarity`` is the GROUP-centroid score and the best single group
    member is reported alongside.
    """

    similarity: float
    best_member_name: str | None = None
    best_member_similarity: float | None = None


class SimilarMastersOut(BaseModel):
    """Masters with slaves, sorted by similarity to the selection."""

    items: list[SimilarMasterItemOut]


# ── Mutations ───────────────────────────────────────────────────────────────


class BulkAction(StrEnum):
    """Supported bulk actions for the dedup board."""

    ASSIGN = "assign"
    ACTIVATE = "activate"
    DEPRECATED = "deprecated"
    UNASSIGN = "unassign"
    PENDING = "pending"
    ACTIVE = "active"
    REJECTED = "rejected"


class AssignRequest(BaseModel):
    """Assign a slave skill to a master (set ``canonical_id``)."""

    skill_id: int
    master_id: int


class ActivateRequest(BaseModel):
    """Activate a master and its verified slaves (set ``status=confirmed``)."""

    master_id: int
    slave_ids: list[int] = Field(default_factory=list)


class ArchiveRequest(BaseModel):
    """Archive one or more skills (set ``status=archived``)."""

    skill_ids: list[int] = Field(min_length=1)


class UnassignRequest(BaseModel):
    """Remove master assignment (set ``canonical_id=NULL``)."""

    skill_ids: list[int] = Field(min_length=1)


class DissolveGroupRequest(BaseModel):
    """Dissolve a master group completely.

    Sets ``canonical_id=NULL`` for all slaves and ``status=pending`` for
    the master AND all its former slaves so every card re-appears as an
    independent master without slaves.
    """

    master_id: int


class ActionResultOut(BaseModel):
    """Generic result for mutation endpoints."""

    updated: int


class BulkActionRequest(BaseModel):
    """Bulk mutation: apply one action to a list of skill IDs.

    ``master_id`` is required when ``action == "assign"``.
    """

    action: BulkAction
    skill_ids: list[int] = Field(min_length=1)
    master_id: int | None = None

    @model_validator(mode="after")
    def _validate_master_required(self) -> BulkActionRequest:
        """Ensure ``master_id`` is set whenever the action assigns to a master.

        Returns:
            The validated model instance.

        Raises:
            ValueError: If ``action`` is ``assign`` without a ``master_id``.
        """
        if self.action == BulkAction.ASSIGN and self.master_id is None:
            raise ValueError("master_id is required for assign action")
        return self


# ── Responses ───────────────────────────────────────────────────────────────


class BatchDedupResponse(BaseModel):
    """Response schema for ``POST /admin/fbf/batch-dedup/run``.

    Attributes:
        status: ``"completed"`` on success, ``"error"`` on failure.
        total_processed: Total number of PM entries processed.
        new_projects: Number of newly created canonical Projects.
        duplicates_found: Number of PM entries matched to an existing Project.
        errors: Number of entries where processing failed.
        stats: Optional extended statistics dict from the mapper
            (url_matches, embedding_calls, estimated_cost, etc.).
    """

    model_config = ConfigDict(from_attributes=True)

    status: str
    total_processed: int
    new_projects: int
    duplicates_found: int
    errors: int
    projects_deleted: int = 0
    stats: dict[str, Any] | None = None


class CousinProjectOut(BaseModel):
    """A single cousin project result from LanceDB similarity search.

    Attributes:
        project_id: Primary key of the canonical Project.
        title: Project title.
        city: Project city (or None).
        similarity: Cosine similarity score (0.0–1.0).
    """

    model_config = ConfigDict(from_attributes=True)

    project_id: int
    title: str
    city: str | None
    similarity: float


class CousinsResponse(BaseModel):
    """Response schema for the cousins endpoint.

    Attributes:
        freelancermap_id: ID of the ProjectFreelancerMap entry.
        cousins: Top-10 semantically similar canonical Projects.
    """

    model_config = ConfigDict(from_attributes=True)

    freelancermap_id: int
    cousins: list[CousinProjectOut]


class DedupHealthResponse(BaseModel):
    """Response schema for ``GET /admin/fbf/dedup/health``.

    Attributes:
        table_size: Number of entries in LanceDB ``project_embeddings``.
        threshold: Cosine-similarity threshold from env ``DEDUP_THRESHOLD``.
        model: Embedding model from env ``EMBEDDING_MODEL``.
        top_k: Number of top results from env ``DEDUP_TOP_K``.
    """

    model_config = ConfigDict(from_attributes=True)

    table_size: int
    threshold: float
    model: str
    top_k: int


class UnlinkResponse(BaseModel):
    """Response schema for the unlink endpoint.

    Attributes:
        status: Always ``"unlinked"``.
        freelancermap_id: ID of the unlinked ProjectFreelancerMap entry.
    """

    model_config = ConfigDict(from_attributes=True)

    status: str
    freelancermap_id: int


class SwitchCanonicalResponse(BaseModel):
    """Response schema for the switch-canonical endpoint.

    Attributes:
        status: Always ``"switched"``.
        old_project_id: ID of the deleted old canonical Project.
        new_project_id: ID of the newly created canonical Project.
    """

    model_config = ConfigDict(from_attributes=True)

    status: str
    old_project_id: int
    new_project_id: int


class SiblingsResponse(BaseModel):
    """Neighbour ids for a project within the current filtered, sorted list.

    Attributes:
        prev_id: Id of the preceding project, or None at the start of the view.
        next_id: Id of the following project, or None at the end of the view.
    """

    prev_id: int | None
    next_id: int | None


class SetCanonicalRequest(BaseModel):
    """Request body for manually linking or unlinking a Freelancermap entry.

    Attributes:
        canonical_project_id: ID of the target canonical Project.
            Pass ``null`` to unlink (canonical_project_id = NULL).
    """

    model_config = ConfigDict(from_attributes=True)

    canonical_project_id: int | None


class SetCanonicalResponse(BaseModel):
    """Response schema for the set-canonical endpoint.

    Attributes:
        status: ``"linked"`` or ``"unlinked"``.
        project_id: ID of the affected normalised Project (project-based endpoint).
        freelancermap_id: ID of the ProjectFreelancerMap entry (legacy FM-based endpoint).
        canonical_project_id: New canonical project ID (None if unlinked).
        repointed_slave_ids: IDs of the degraded project's former slaves that
            were re-pointed to the new master (empty unless a project with own
            slaves was linked).
    """

    model_config = ConfigDict(from_attributes=True)

    status: str
    project_id: int | None = None
    freelancermap_id: int | None = None
    canonical_project_id: int | None = None
    repointed_slave_ids: list[int] = Field(default_factory=list)
