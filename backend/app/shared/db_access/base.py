"""SQLAlchemy declarative base for all ORM models."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Central declarative base class – kanonische, EINZIGE Base.

    All ORM models (core + gjo_se_com) must inherit from this class to be
    picked up by SQLAlchemy metadata and Alembic autogenerate. Es gibt genau
    EINEN kanonischen Pfad (app.shared.db_access.base) → genau EINE
    Base.metadata für Ziel-DB gjose.
    """
