"""Integration tests for the portfolio proof-image upload service.

Exercises validation (content type/size), the storage-key contract and the
``image_src`` update against the real Postgres test database. The object store
is replaced by a recording in-memory double at the system boundary.
"""

from __future__ import annotations

import io

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.datastructures import Headers, UploadFile

from app.portfolio.exceptions import PortfolioNotFoundError, ProofNotFoundError
from app.portfolio.models.portfolio import Portfolio
from app.portfolio.models.proof import Proof
from app.portfolio.services import portfolio_image_service
from app.shared.storage.exceptions import ImageTooLargeError, InvalidImageTypeError

pytestmark = [pytest.mark.integration, pytest.mark.xdist_group("db")]

_MAX_IMAGE_SIZE = 5 * 1024 * 1024


class _RecordingObjectStore:
    """In-memory object-store double that records every stored key."""

    def __init__(self) -> None:
        self.stored: dict[str, bytes] = {}

    async def put(self, key: str, data: bytes) -> None:
        """Record a stored object under *key*."""
        self.stored[key] = data


def _upload(content_type: str, data: bytes = b"fake-image-bytes") -> UploadFile:
    """Build an ``UploadFile`` with the given content type and payload."""
    return UploadFile(file=io.BytesIO(data), filename="proof.png", headers=Headers({"content-type": content_type}))


async def _create_portfolio(db: AsyncSession, slug: str) -> Portfolio:
    portfolio = Portfolio(slug=slug)
    db.add(portfolio)
    await db.commit()
    return portfolio


async def _create_proof(db: AsyncSession, portfolio_id: int) -> Proof:
    proof = Proof(portfolio_id=portfolio_id, sort=0)
    db.add(proof)
    await db.commit()
    return proof


@pytest.fixture()
def recording_store(monkeypatch: pytest.MonkeyPatch) -> _RecordingObjectStore:
    """Replace the object-store factory with a recording double."""
    store = _RecordingObjectStore()
    monkeypatch.setattr(portfolio_image_service, "get_object_store", lambda: store)
    return store


async def test_upload_proof_image_stores_key_and_updates_proof(
    db_session: AsyncSession,
    recording_store: _RecordingObjectStore,
) -> None:
    """A valid image is stored under the slug/proof key and linked on the proof."""
    portfolio = await _create_portfolio(db_session, "uploader")
    proof = await _create_proof(db_session, portfolio.id)

    key = await portfolio_image_service.upload_proof_image(db_session, portfolio.id, proof.id, _upload("image/png"))

    assert key == f"uploader/proof-{proof.id}.png"
    assert recording_store.stored[key] == b"fake-image-bytes"
    await db_session.refresh(proof)
    assert proof.image_src == key


async def test_upload_proof_image_rejects_unsupported_content_type(
    db_session: AsyncSession,
    recording_store: _RecordingObjectStore,
) -> None:
    """A non-supported content type is rejected before any store write."""
    portfolio = await _create_portfolio(db_session, "bad-type")
    proof = await _create_proof(db_session, portfolio.id)

    with pytest.raises(InvalidImageTypeError):
        await portfolio_image_service.upload_proof_image(db_session, portfolio.id, proof.id, _upload("image/gif"))

    assert recording_store.stored == {}


async def test_upload_proof_image_rejects_oversized_file(
    db_session: AsyncSession,
    recording_store: _RecordingObjectStore,
) -> None:
    """A file larger than 5 MB is rejected."""
    portfolio = await _create_portfolio(db_session, "too-large")
    proof = await _create_proof(db_session, portfolio.id)
    oversized = b"x" * (_MAX_IMAGE_SIZE + 1)

    with pytest.raises(ImageTooLargeError):
        await portfolio_image_service.upload_proof_image(
            db_session, portfolio.id, proof.id, _upload("image/png", oversized)
        )

    assert recording_store.stored == {}


async def test_upload_proof_image_raises_for_unknown_portfolio(
    db_session: AsyncSession,
    recording_store: _RecordingObjectStore,
) -> None:
    """An unknown portfolio id raises ``PortfolioNotFoundError``."""
    with pytest.raises(PortfolioNotFoundError):
        await portfolio_image_service.upload_proof_image(db_session, 999_999, 1, _upload("image/png"))


async def test_upload_proof_image_rejects_foreign_proof(
    db_session: AsyncSession,
    recording_store: _RecordingObjectStore,
) -> None:
    """A proof that belongs to another portfolio is rejected."""
    owner = await _create_portfolio(db_session, "owner")
    other = await _create_portfolio(db_session, "other")
    foreign_proof = await _create_proof(db_session, other.id)

    with pytest.raises(ProofNotFoundError):
        await portfolio_image_service.upload_proof_image(db_session, owner.id, foreign_proof.id, _upload("image/png"))
