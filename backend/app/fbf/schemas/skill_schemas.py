"""Pydantic schemas for FBF skills (create / update / out)."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.shared.tagging.schemas.tag_schemas import TagOut

_MIN_SCORE = 0
_MAX_SCORE = 5


class SkillCreate(BaseModel):
    """Request body for creating a new FBF skill.

    Der Initialstatus wird via ``core_statusable`` gesetzt (Default: pending).
    """

    name: str
    description: str | None = Field(default=None)
    importance: int | None = Field(default=None, ge=_MIN_SCORE, le=_MAX_SCORE)
    level: int | None = Field(default=None, ge=_MIN_SCORE, le=_MAX_SCORE)
    level_public: int | None = Field(default=None, ge=_MIN_SCORE, le=_MAX_SCORE)
    group_id: int | None = Field(default=None)


class SkillUpdate(SkillCreate):
    """Request body for updating an existing FBF skill."""

    canonical_id: int | None = Field(default=None)


class SkillOut(BaseModel):
    """Public skill data for API responses (curated FBF skill).

    Der Status wird nicht mehr als Feld ausgegeben – er ist via
    ``core_statusable``-API abrufbar.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    importance: int | None = None
    level_public: int | None = None
    group_id: int | None = None
    tags: list[TagOut] = []


class SkillPublicOut(BaseModel):
    """Public skill payload for the public skills page (tag ``site:public`` only)."""

    model_config = ConfigDict(from_attributes=True)

    name: str
    level_public: int | None = None
    importance: float | None = None
    group_id: int | None = None
    sort: int | None = None
    tags: list[TagOut] = []


class SkillGroupOut(BaseModel):
    """Public output for a curated skill group (``fbf_skill_group``).

    Liefert die Metadaten, die das FE zum Sortieren (``sort``) und Beschriften
    (``label``) des Skills-Grids braucht, sowie die Karten-Prioritaet
    (``priority``, ``high``/``medium``/``base``). Der ``label`` ist lokalisiert –
    der Locale-Pick (Fallback ``de``) erfolgt im Service.
    """

    id: int
    sort: int
    priority: str
    label: str


class SkillGroupAdminOut(BaseModel):
    """Admin output for a curated skill group (``fbf_skill_group``).

    Trägt die Reihenfolge (``sort``), die Prioritaet (``priority``,
    ``high``/``medium``/``base``) sowie alle lokalisierten ``labels`` als
    ``dict[locale → str]``. Anders als ``SkillGroupOut`` wird hier kein
    Locale-Pick angewendet – der Admin editiert jede Sprache einzeln.
    """

    id: int
    sort: int
    priority: str
    labels: dict[str, str]
    skill_count: int = 0


class SkillGroupCreate(BaseModel):
    """Request body for creating a new skill group.

    ``labels`` ist ein Locale→Label-Mapping (mind. ein Eintrag, z.B. ``de``).
    Die Reihenfolge (``sort``) wird automatisch ans Ende angehaengt; die
    Prioritaet ist optional (Default ``medium``).
    """

    labels: dict[str, str] = Field(..., min_length=1)
    priority: Literal["high", "medium", "base"] | None = None


class SkillGroupUpdate(BaseModel):
    """Request body for partially updating a skill group.

    Alle Felder sind optional. Wird ``labels`` mitgegeben, ersetzt es die
    bestehenden Translation-Rows (Translation-Table-Pattern, analog
    Proof-Statements).
    """

    sort: int | None = None
    priority: Literal["high", "medium", "base"] | None = None
    labels: dict[str, str] | None = Field(
        default=None,
        description="locale → Label; ersetzt bestehende Rows via replace",
    )


class SkillGroupReorderRequest(BaseModel):
    """Request body for batch-reordering skill groups.

    ``ordered_ids`` listet die Gruppen-IDs in gewuenschter Reihenfolge; der
    Listenindex wird zum ``sort``-Wert.
    """

    ordered_ids: list[int] = Field(..., min_length=1)


class SkillReorderRequest(BaseModel):
    """Request body for batch-reordering skills within a group."""

    group_id: int
    ordered_ids: list[int] = Field(..., min_length=1)


class SkillAdminOut(SkillOut):
    """Admin skill data including the internal ``level``, project usage count, and core status."""

    level: int | None = None
    project_count: int = 0
    project_percentage: float | None = None
    avg_project_importance: float | None = None
    canonical_id: int | None = None
    master_name: str | None = None
    status: str | None = None
    status_color_token: str | None = None
    sort: int | None = None


class SkillConfirmRequest(BaseModel):
    """Request body for batch-confirming pending skills."""

    ids: list[int] = Field(min_length=1)


class SkillReassignRequest(BaseModel):
    """Request body for repointing a skill's project links to another skill."""

    target_id: int | None = None


class SkillRejectRequest(BaseModel):
    """Request body for rejecting a pending skill (repoint + delete)."""

    reassign_to_id: int | None = None
