"""SQLAlchemy-Modell fuer Skill (FBF-Domain, kuratierte Skill-Tabelle)."""

from sqlalchemy import ARRAY, Float, ForeignKey, Integer, SmallInteger, String, Text, and_
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.db_access.base import Base
from app.shared.tagging.models.tag import Tag, Taggable


class Skill(Base):
    """Kuratierter Skill der FBF-Domain (flacher Katalog, ohne Aliasse).

    Die LLM-Extraktion waehlt aus den bestaetigten (``confirmed``) Skills den
    passenden aus oder schlaegt genau einen neuen ``pending`` Skill vor (analog
    ``JobRole``). Synonyme werden dadurch bereits zur Extraktionszeit auf den
    vorhandenen Katalog abgebildet – es gibt keine separaten Alias-Zeilen mehr.

    Der Kuratierungsstatus wird nicht mehr als Spalte am Modell gefuehrt,
    sondern via ``core_statusable`` (polymorphe Junction-Table) abgebildet.

    Attributes:
        id: Primaerschluessel.
        name: Skill-Name – global eindeutig.
        importance: Kuratierte Wichtigkeit fuer die Job-Rolle (0–5).
        level: Interner Wissensstand (0–5) – fuer Analyse und Match-Score.
        level_public: Nach aussen gezeigter Wissensstand (0–5).
        vector: Embedding-Vektor (1536-dim) fuer Dedup-Clustering.
        canonical_id: Self-FK – NULL = Master; gesetzt = Synonym dieses Skills.
        group_id: FK auf ``fbf_skill_group.id`` – kuratierte Skill-Gruppe (nullable –
            nur die kuratierten Master tragen eine Gruppe, Epic 185).
        tags: Zugeordnete Core-Tags (n:m via ``core_taggable``,
            read-only – Schreibzugriffe laufen ueber Core-Tag-API).
    """

    __tablename__ = "fbf_skill"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    importance: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    level: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    level_public: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    vector: Mapped[list[float] | None] = mapped_column(ARRAY(Float), nullable=True)
    canonical_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("fbf_skill.id"), nullable=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    group_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("fbf_skill_group.id"), nullable=True)
    sort: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tags: Mapped[list["Tag"]] = relationship(
        "Tag",
        secondary="shared_taggable",
        primaryjoin=lambda: and_(
            Skill.id == Taggable.taggable_id,
            Taggable.taggable_type == "fbf_skill",
        ),
        secondaryjoin=Taggable.tag_id == Tag.id,
        viewonly=True,
        lazy="selectin",
        order_by="Tag.name",
    )
