"""Pydantic output schemas for portfolio proof image uploads (gjo_se_com)."""

from pydantic import BaseModel


class PortfolioImageOut(BaseModel):
    """Response of a successful proof image upload.

    ``image_src`` carries the storage key under which the uploaded file was
    persisted in the object store (e.g. ``my-project/proof-3.png``).
    """

    image_src: str
