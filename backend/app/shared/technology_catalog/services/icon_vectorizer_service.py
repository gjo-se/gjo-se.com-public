"""Icon Vectorizer – PNG to SVG conversion via VTracer with quality gate."""

from __future__ import annotations

import structlog
import vtracer

from app.shared.storage.domain.base_contract import ObjectStore

logger = structlog.get_logger(__name__)


async def vectorize_icon(png_data: bytes, svg_key: str, store: ObjectStore) -> bytes | None:
    """Convert PNG bytes to SVG via VTracer and persist via ObjectStore.

    Args:
        png_data: Raw PNG bytes downloaded from the CDN.
        svg_key: ObjectStore key under which the SVG should be stored.
        store: ObjectStore implementation used to persist the SVG.

    Returns:
        The SVG bytes if conversion and storage succeeded, ``None`` otherwise.
    """
    try:
        svg_str = vtracer.convert_raw_image_to_svg(
            png_data,
            img_format="png",
            colormode="color",
            hierarchical="stacked",
        )
    except Exception:
        logger.exception("vtracer conversion failed", svg_key=svg_key)
        return None

    svg_data = svg_str.encode("utf-8")
    await store.put(svg_key, svg_data)
    return svg_data
