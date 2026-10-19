"""Icon Downloader – Drain-until-empty batch download and vectorize missing technology icons from the icon CDN.

Every DB access lives in ``icon_download_repository`` (Achse 2: ``services`` >
``repositories``; K1/K2/K3); the service orchestrates over domain records and
hands them back for persistence.
"""

from __future__ import annotations

import asyncio
import hashlib
import random
from dataclasses import dataclass
from datetime import UTC, datetime

import httpx
import structlog

from app.shared.config.config import settings
from app.shared.db_access.session_types import AsyncSession
from app.shared.storage.domain.base_contract import ObjectStore
from app.shared.storage.infrastructure.factory_client import get_object_store
from app.shared.technology_catalog.domain.technology_catalog_contract import IconDownloadRecord
from app.shared.technology_catalog.repositories import icon_download_repository
from app.shared.technology_catalog.schemas.technology_schemas import IconDownloadResultOut
from app.shared.technology_catalog.services.icon_vectorizer_service import vectorize_icon

logger = structlog.get_logger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────────

STORAGE_PREFIX = "technology-catalog"
CHUNK_SIZE = 50
MAX_RUNTIME_MINUTES = 90
MIN_DELAY = 5  # seconds
MAX_DELAY = 15  # seconds
BACKOFF_BASE = 30  # seconds – start delay when rate-limited (429/5xx)
BACKOFF_MAX = 120  # seconds – cap for exponential backoff
MAX_RETRIES = icon_download_repository.MAX_RETRIES

# Session factory and SELECT builder live in the repository (K3/K1); kept as
# module attributes so the service opens its session through the repository
# layer and internal references stay valid without a SQLAlchemy import here
# (documented exception).
AsyncSessionLocal = icon_download_repository.AsyncSessionLocal
_build_select_query = icon_download_repository.build_select_query

# ── State ──────────────────────────────────────────────────────────────────────


def _cdn_base_url() -> str:
    """Return the configured icon CDN base URL, failing fast when it is unset.

    Returns:
        The ``TECHNOLOGY_CATALOG_ICON_CDN`` setting without a trailing slash.

    Raises:
        RuntimeError: When the setting is empty.
    """
    base_url = settings.TECHNOLOGY_CATALOG_ICON_CDN.rstrip("/")
    if not base_url:
        raise RuntimeError("TECHNOLOGY_CATALOG_ICON_CDN is not configured")
    return base_url


@dataclass
class _BackoffState:
    """Mutable holder for the adaptive backoff, scoped to a single download run."""

    value: float = 0.0


def _adaptive_delay(backoff: _BackoffState) -> float:
    """Compute per-icon delay: base jitter plus current backoff penalty."""
    return random.uniform(MIN_DELAY, MAX_DELAY) + backoff.value


def _increase_backoff(backoff: _BackoffState) -> None:
    """Exponential increase of backoff on rate-limit errors."""
    backoff.value = min(max(backoff.value * 2, BACKOFF_BASE), BACKOFF_MAX)


def _decrease_backoff(backoff: _BackoffState) -> None:
    """Gradual decay of backoff on successful requests."""
    backoff.value = max(backoff.value // 2, 0.0)


_HTTP_TOO_MANY_REQUESTS = 429
_HTTP_SERVER_ERROR_MIN = 500
_HTTP_SERVER_ERROR_MAX = 600  # exklusiv – deckt 5xx ab


def _is_rate_limit_status(status_code: int) -> bool:
    """Check if an HTTP status indicates rate-limiting (429) or server error (5xx)."""
    return status_code == _HTTP_TOO_MANY_REQUESTS or _HTTP_SERVER_ERROR_MIN <= status_code < _HTTP_SERVER_ERROR_MAX


async def run_icon_downloader() -> IconDownloadResultOut:
    """Download missing PNG icons from the icon CDN and convert them to SVG.

    Runs a drain-until-empty loop: processes icons in chunks of ``CHUNK_SIZE``
    until the queue is empty **or** ``MAX_RUNTIME_MINUTES`` is reached.
    Rate-limiting uses a conservative base delay (15–45 s) plus an adaptive
    backoff that increases on HTTP 429/5xx and decays on successful requests.

    Returns:
        ``IconDownloadResultOut`` with per-category counts and ``drained`` status.
    """
    result = IconDownloadResultOut()
    store = get_object_store()
    backoff = _BackoffState()
    start_time = datetime.now(UTC)

    try:
        async with AsyncSessionLocal() as db:
            while True:
                # ── Time-limit check ──────────────────────────────────────────
                elapsed = (datetime.now(UTC) - start_time).total_seconds() / 60.0
                if elapsed >= MAX_RUNTIME_MINUTES:
                    logger.info(
                        "Icon downloader stopped – time limit reached",
                        elapsed_minutes=round(elapsed, 1),
                        max_runtime_minutes=MAX_RUNTIME_MINUTES,
                        **result.model_dump(),
                    )
                    result.drained = False
                    return result

                # ── Fetch next chunk ─────────────────────────────────────────
                stmt = _build_select_query(CHUNK_SIZE)
                icons_result = await db.execute(stmt)
                icon_ids: list[int] = list(icons_result.scalars().all())

                if not icon_ids:
                    logger.info(
                        "Icon downloader stopped – queue drained",
                        elapsed_minutes=round(elapsed, 1),
                        **result.model_dump(),
                    )
                    result.drained = True
                    return result

                logger.info(
                    "Icon download chunk started",
                    icon_count=len(icon_ids),
                    elapsed_minutes=round(elapsed, 1),
                    current_backoff=backoff.value,
                )

                # ── Process chunk (respecting adaptive delay between icons) ──
                for idx, icon_id in enumerate(icon_ids):
                    if idx > 0:
                        delay = _adaptive_delay(backoff)
                        await asyncio.sleep(delay)

                    await _process_single_icon(icon_id, store, result, db, backoff)

    except Exception:
        logger.exception("Icon downloader failed")
        raise


async def _persist_svg(
    db: AsyncSession,
    store: ObjectStore,
    result: IconDownloadResultOut,
    icon: IconDownloadRecord,
    slug: str,
    png_data: bytes,
) -> None:
    """SVG-Vektorisierung + Persistenz (Phase 2); Fehler sind nicht fatal."""
    svg_key = f"{STORAGE_PREFIX}/{slug}_{icon.variant}.svg"
    try:
        svg_data = await vectorize_icon(png_data, svg_key, store)
        if svg_data is not None:
            await icon_download_repository.save_svg(
                db,
                icon.id,
                svg_storage_key=svg_key,
                svg_downloaded_at=datetime.now(UTC),
                svg_file_size=len(svg_data),
            )
            result.svg_converted += 1
            logger.info("Icon persisted", icon_id=icon.id, slug=slug, phase="svg")
        else:
            result.svg_skipped += 1
            logger.info(
                "Icon processed – SVG skipped",
                slug=slug,
                variant=icon.variant,
            )
    except Exception:
        await db.rollback()
        logger.exception(
            "Icon SVG vectorization failed",
            icon_id=icon.id,
            variant=icon.variant,
        )
        # PNG already committed – icon not counted as failed


async def _record_failure(
    db: AsyncSession,
    result: IconDownloadResultOut,
    icon_id: int,
    error: str,
) -> None:
    """Rollback, danach Icon frisch laden und Retry-Buchhaltung persistieren."""
    await db.rollback()
    record = await icon_download_repository.load_icon(db, icon_id)
    if record is None:
        result.failed += 1
        return
    retry_count = record.retry_count + 1
    await icon_download_repository.save_failure(
        db,
        record.id,
        retry_count=retry_count,
        last_error=error[:500],
        last_attempt_at=datetime.now(UTC),
    )
    result.failed += 1
    if retry_count >= MAX_RETRIES:
        logger.warning(
            "Icon max retries reached – skipping permanently",
            icon_id=record.id,
            retry_count=retry_count,
        )


async def _process_single_icon(
    icon_id: int,
    store: ObjectStore,
    result: IconDownloadResultOut,
    db: AsyncSession,
    backoff: _BackoffState,
) -> None:
    """Download, persist, and vectorize a single icon.

    Loads the icon fresh from the database for each run. This avoids holding
    ORM instances across ``db.rollback()`` calls (which expire all session
    objects and would raise ``MissingGreenlet`` on later attribute access).

    Handles rate-limit errors (429/5xx) with adaptive backoff and
    delegates other HTTP errors to generic exception handling.
    """
    # ── Load fresh icon (may be None if deleted mid-run) ───────────────────
    record = await icon_download_repository.load_icon_with_technology(db, icon_id)
    if record is None:
        result.failed += 1
        logger.warning(
            "Icon no longer exists – skipping",
            icon_id=icon_id,
        )
        return

    url = f"{_cdn_base_url()}/{record.variant}/{record.icon_external_id}.png"
    slug = record.slug

    # ── Phase 1: PNG download & persist ────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            png_data = response.content

        # Success → decay backoff
        _decrease_backoff(backoff)

        png_key = f"{STORAGE_PREFIX}/{slug}_{record.variant}.png"
        await store.put(png_key, png_data)
        await icon_download_repository.save_png(
            db,
            record.id,
            storage_key=png_key,
            downloaded_at=datetime.now(UTC),
            file_size=len(png_data),
            content_hash=hashlib.sha256(png_data).hexdigest(),
        )

        result.downloaded += 1
        logger.info("Icon persisted", icon_id=record.id, slug=slug, phase="png")

    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code
        if _is_rate_limit_status(status_code):
            _increase_backoff(backoff)
            logger.warning(
                "Rate limit or server error – increasing backoff",
                icon_id=record.id,
                status_code=status_code,
                new_backoff=backoff.value,
                exc_info=True,
            )
        await _record_failure(db, result, record.id, str(exc))
        return

    except Exception as exc:
        logger.exception(
            "Icon download error – rolling back and retrying",
            icon_id=record.id,
            variant=record.variant,
        )
        await _record_failure(db, result, record.id, str(exc))
        return

    # ── Phase 2: SVG vectorization & persist ────────────────────────────────
    await _persist_svg(db, store, result, record, slug, png_data)
