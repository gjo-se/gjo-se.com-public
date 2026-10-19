"""Unit tests for the CV render/store/regenerate orchestration.

``render_application_cv``, ``store_cv_document`` and ``regenerate_cv_document``
are DB/object-store/pdf-coupled. The persistence seam (document repository), the
object store and the PDF render are replaced by recording doubles, so the
orchestration contract is asserted without a real database, storage or WeasyPrint.
"""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from typing import Any

import pytest

from app.application.schemas.document_schemas import DocumentOut
from app.application.schemas.submission_schemas import SubmissionDetailOut
from app.application.services import cv_document_service
from app.shared.storage.domain.base_contract import ObjectNotFoundError

pytestmark = pytest.mark.unit

_NOW = datetime(2026, 1, 1, tzinfo=UTC)
_PDF = b"%PDF-1.4\nbody\n"


class _FakeObjectStore:
    """Object-store double recording puts/deletes and the failed-delete path."""

    def __init__(self, *, fail_delete: bool = False) -> None:
        """Configure whether ``delete`` raises ``ObjectNotFoundError``."""
        self.puts: list[tuple[str, bytes, dict[str, str] | None]] = []
        self.deleted: list[str] = []
        self._fail_delete = fail_delete

    async def put(self, key: str, data: bytes, *, metadata: dict[str, str] | None = None) -> str:
        """Record a put and return the key."""
        self.puts.append((key, data, metadata))
        return key

    async def delete(self, key: str) -> None:
        """Record a delete or raise ``ObjectNotFoundError``."""
        if self._fail_delete:
            raise ObjectNotFoundError(key)
        self.deleted.append(key)

    async def get(self, key: str) -> bytes:
        """Return empty bytes (unused by the document flow)."""
        return b""


class _RecordingDocumentRepository:
    """Document-repository double recording create/delete and the old CV rows."""

    def __init__(self, existing: list[DocumentOut] | None = None) -> None:
        """Store the existing CV rows the ``get_cv_by_submission`` read returns."""
        self._existing = existing or []
        self.created: list[dict[str, Any]] = []
        self.deleted: list[int] = []

    async def get_cv_by_submission(self, db: object, submission_id: int) -> list[DocumentOut]:
        """Return the configured existing CV documents."""
        return list(self._existing)

    async def create_cv_document(self, db: object, **kwargs: Any) -> DocumentOut:
        """Record the create payload and return a persisted-looking DTO."""
        self.created.append(kwargs)
        return DocumentOut(
            id=99,
            application_submission_id=kwargs["application_submission_id"],
            kind="cv",
            storage_key=kwargs["storage_key"],
            filename=kwargs["filename"],
            mime_type=kwargs["mime_type"],
            size_bytes=kwargs["size_bytes"],
            checksum_sha256=kwargs["checksum_sha256"],
            render_context=kwargs["render_context"],
            generated_at=_NOW,
            created_at=_NOW,
        )

    async def delete_by_id(self, db: object, document_id: int) -> None:
        """Record a deleted document id."""
        self.deleted.append(document_id)


class _RecordingContextBuilder:
    """Records the CV-context build calls and returns a fixed context."""

    def __init__(self, context: dict[str, object]) -> None:
        """Store the context every build call returns."""
        self._context = context
        self.calls: list[dict[str, Any]] = []

    async def build(self, db: object, **kwargs: Any) -> dict[str, object]:
        """Record one build call and return the configured context."""
        self.calls.append(kwargs)
        return self._context


def _submission(*, submission_id: int = 5, project_id: int = 7) -> SubmissionDetailOut:
    """Build a persisted-submission DTO for the document flow."""
    return SubmissionDetailOut(
        id=submission_id,
        project_id=project_id,
        sender_profile_id=1,
        subject="Bewerbung",
        body="Guten Tag,",
        language="de",
        sender_email="person@example.test",
        recipient_email="hr@example.test",
        created_at=_NOW,
        updated_at=_NOW,
    )


def _document(storage_key: str, *, render_context: dict[str, Any] | None = None) -> DocumentOut:
    """Build a persisted CV document DTO."""
    return DocumentOut(
        id=1,
        application_submission_id=5,
        kind="cv",
        storage_key=storage_key,
        filename="cv.pdf",
        mime_type="application/pdf",
        size_bytes=1,
        checksum_sha256="0" * 64,
        render_context=render_context,
        generated_at=_NOW,
        created_at=_NOW,
    )


def _wire(
    monkeypatch: pytest.MonkeyPatch,
    *,
    repo: _RecordingDocumentRepository,
    store: _FakeObjectStore,
    builder: _RecordingContextBuilder,
) -> None:
    """Patch the repository/store/context boundaries with recording doubles."""
    monkeypatch.setattr(cv_document_service.document_repository, "create_cv_document", repo.create_cv_document)
    monkeypatch.setattr(cv_document_service.document_repository, "get_cv_by_submission", repo.get_cv_by_submission)
    monkeypatch.setattr(cv_document_service.document_repository, "delete_by_id", repo.delete_by_id)
    monkeypatch.setattr(cv_document_service, "get_object_store", lambda: store)
    monkeypatch.setattr(cv_document_service.cv_context_service, "build_application_cv_context", builder.build)

    async def _fake_generate_pdf(template_name: str, data: dict[str, object]) -> bytes:
        """Return the fixed PDF bytes without invoking WeasyPrint."""
        return _PDF

    monkeypatch.setattr(cv_document_service.pdf_service, "generate_pdf", _fake_generate_pdf)


async def test_render_application_cv_returns_pdf_bytes_and_filename(monkeypatch: pytest.MonkeyPatch) -> None:
    """Render returns the PDF bytes plus the context-derived file name."""
    builder = _RecordingContextBuilder({"profile": {"full_name": "Greg Erdmann"}, "project": None})
    _wire(
        monkeypatch,
        repo=_RecordingDocumentRepository(),
        store=_FakeObjectStore(),
        builder=builder,
    )

    rendered = await cv_document_service.render_application_cv(object(), catalog=None, skills=None, project_id=None)

    assert rendered.pdf_bytes == _PDF
    assert rendered.filename == "Greg_Erdmann_Lebenslauf.pdf"
    assert builder.calls[0]["project_id"] is None
    assert builder.calls[0]["use_default_skills"] is False


async def test_store_cv_document_rejects_an_unpersisted_submission() -> None:
    """A submission without an id cannot own a CV document."""
    with pytest.raises(ValueError):
        await cv_document_service.store_cv_document(
            object(), submission=_submission(submission_id=0), pdf_bytes=_PDF, context={}
        )


async def test_store_cv_document_writes_the_object_and_the_row(monkeypatch: pytest.MonkeyPatch) -> None:
    """The PDF is written to the store and a checksummed document row is created."""
    repo = _RecordingDocumentRepository()
    store = _FakeObjectStore()
    _wire(monkeypatch, repo=repo, store=store, builder=_RecordingContextBuilder({}))
    context: dict[str, object] = {
        "profile": {"full_name": "Greg Erdmann"},
        "project": None,
        "skills": [{"name": "Python"}, {"name": "Go"}],
        "skill_groups": [{"label": "Languages", "skills": ["Python", "Go"]}],
        "skills_radar": [{"name": "Python"}],
        "use_default_skills": True,
    }

    created = await cv_document_service.store_cv_document(
        object(), submission=_submission(), pdf_bytes=_PDF, context=context
    )

    key, data, metadata = store.puts[0]
    assert created.id == 99
    assert key.startswith("application-cv/")
    assert key.endswith(".pdf")
    assert data == _PDF
    assert metadata == {"filename": created.filename}
    assert created.filename == "Greg_Erdmann_Lebenslauf.pdf"

    payload = repo.created[0]
    assert payload["mime_type"] == "application/pdf"
    assert payload["size_bytes"] == len(_PDF)
    assert payload["checksum_sha256"] == hashlib.sha256(_PDF).hexdigest()
    assert payload["render_context"] == {
        "skills": ["Python", "Go"],
        "skill_groups": [{"label": "Languages", "skills": ["Python", "Go"]}],
        "skills_radar": [{"name": "Python"}],
        "use_default_skills": True,
    }


async def test_store_cv_document_honors_an_explicit_filename(monkeypatch: pytest.MonkeyPatch) -> None:
    """An explicit file name overrides the context-derived one."""
    repo = _RecordingDocumentRepository()
    _wire(monkeypatch, repo=repo, store=_FakeObjectStore(), builder=_RecordingContextBuilder({}))

    created = await cv_document_service.store_cv_document(
        object(), submission=_submission(), pdf_bytes=_PDF, context={}, filename="custom.pdf"
    )

    assert created.filename == "custom.pdf"
    assert repo.created[0]["filename"] == "custom.pdf"


async def test_regenerate_cv_document_replaces_the_old_snapshot(monkeypatch: pytest.MonkeyPatch) -> None:
    """Regenerate deletes the old object/row and stores exactly one fresh snapshot."""
    repo = _RecordingDocumentRepository(
        existing=[_document("application-cv/old.pdf", render_context={"use_default_skills": True})]
    )
    store = _FakeObjectStore()
    builder = _RecordingContextBuilder({"profile": {"full_name": "Greg Erdmann"}, "project": None})
    _wire(monkeypatch, repo=repo, store=store, builder=builder)

    created = await cv_document_service.regenerate_cv_document(
        object(), submission=_submission(), catalog=None, skills=None
    )

    assert created.id == 99
    assert store.deleted == ["application-cv/old.pdf"]
    assert repo.deleted == [1]
    assert len(store.puts) == 1
    assert builder.calls[0]["use_default_skills"] is True


async def test_regenerate_cv_document_forces_project_skills_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    """An explicit ``use_default_skills=False`` overrides the stored snapshot mode."""
    repo = _RecordingDocumentRepository(
        existing=[_document("application-cv/old.pdf", render_context={"use_default_skills": True})]
    )
    builder = _RecordingContextBuilder({"profile": {"full_name": "Greg Erdmann"}, "project": None})
    _wire(monkeypatch, repo=repo, store=_FakeObjectStore(), builder=builder)

    await cv_document_service.regenerate_cv_document(
        object(), submission=_submission(), catalog=None, skills=None, use_default_skills=False
    )

    assert builder.calls[0]["use_default_skills"] is False


async def test_regenerate_cv_document_tolerates_a_missing_old_object(monkeypatch: pytest.MonkeyPatch) -> None:
    """An already-missing old object does not break the re-render (row still removed)."""
    repo = _RecordingDocumentRepository(existing=[_document("application-cv/old.pdf")])
    store = _FakeObjectStore(fail_delete=True)
    _wire(monkeypatch, repo=repo, store=store, builder=_RecordingContextBuilder({}))

    created = await cv_document_service.regenerate_cv_document(
        object(), submission=_submission(), catalog=None, skills=None
    )

    assert created.id == 99
    assert store.deleted == []
    assert repo.deleted == [1]
