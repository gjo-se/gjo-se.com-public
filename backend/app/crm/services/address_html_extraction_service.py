"""HTML fetch/text helpers for the address-extraction service.

Owns the HTTP fetch, imprint-link detection and visible-text extraction. Split
out of ``address_extraction_service`` so that module stays cohesive (LCOM4):
this HTTP/HTML cluster shares no collaborator with the LLM/persist cluster.
"""

from __future__ import annotations

import re
from urllib.parse import urljoin

import httpx
import structlog

logger = structlog.get_logger(__name__)

MAX_HTML_TEXT_LENGTH = 8000
"""Max characters of extracted body text sent to the LLM."""

_BROWSER_HEADERS: dict[str, str] = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
}
"""Browser-like headers to avoid 403 blocks from WAFs (e.g. Cloudflare)."""

_IMPRINT_KEYWORDS: tuple[str, ...] = (
    "impressum",
    "imprint",
    "legal-notice",
    "legalnotice",
    "site-notice",
    "sitenotice",
)
"""Keywords to detect imprint links in HTML href attributes.
Note: "legal" alone is intentionally excluded – it matches AGB/terms/privacy
pages which do not contain address information."""

_IMPRINT_FALLBACK_PATHS: tuple[str, ...] = (
    "/impressum",
    "/imprint",
    "/en/imprint",
    "/de/impressum",
    "/impressum/",
    "/imprint/",
)
"""Common imprint URL paths to try if no link found on main page."""


async def resolve_html_text(base_url: str, main_html: str) -> str | None:
    """Return the imprint page text (or the main page as fallback) for extraction.

    Tries the imprint link found on the main page, then the common imprint
    fallback paths, then falls back to the main page text.
    """
    imprint_url = find_imprint_link(main_html, base_url)
    if imprint_url:
        logger.info("Address extraction: found imprint at %s", imprint_url)
        imprint_html = await fetch_url(imprint_url)
        return extract_text(imprint_html) if imprint_html is not None else extract_text(main_html)

    for path in _IMPRINT_FALLBACK_PATHS:
        fallback_url = urljoin(base_url, path)
        fb_html = await fetch_url(fallback_url)
        if fb_html is not None:
            logger.info("Address extraction: using fallback imprint at %s", fallback_url)
            return extract_text(fb_html)

    logger.info("Address extraction: no imprint found, using main page for %s", base_url)
    return extract_text(main_html)


async def fetch_url(url: str) -> str | None:
    """Fetch a URL and return its HTML content, or None on failure.

    Uses browser-like headers to avoid 403 blocks from WAFs.
    """
    try:
        async with httpx.AsyncClient(
            timeout=10.0,
            follow_redirects=True,
            headers=_BROWSER_HEADERS,
        ) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.text
    except httpx.HTTPError as exc:
        logger.warning("Address extraction: HTTP error for %s: %s", url, exc)
        return None


def find_imprint_link(html: str, base_url: str) -> str | None:
    """Search HTML for an imprint/legal link and return its absolute URL.

    Looks for ``<a href="...">`` elements whose href or text contains
    one of the ``_IMPRINT_KEYWORDS``.

    Args:
        html: Raw HTML of the main page.
        base_url: Base URL for resolving relative links.

    Returns:
        Absolute imprint URL or ``None`` if not found.
    """
    # Find all <a> tags with href
    pattern = re.compile(
        r'<a\s[^>]*?href\s*=\s*["\']([^"\']+)["\'][^>]*>(.*?)</a>',
        re.IGNORECASE | re.DOTALL,
    )
    for match in pattern.finditer(html):
        href = match.group(1)
        text = match.group(2)
        combined = f"{href} {text}".lower()
        for keyword in _IMPRINT_KEYWORDS:
            if keyword in combined:
                # Resolve relative URL
                absolute = urljoin(base_url, href)
                if absolute.startswith(("http://", "https://")):
                    return absolute
    return None


def extract_text(html: str) -> str | None:
    """Extract visible body text from HTML, removing scripts and styles.

    Returns text truncated to ``MAX_HTML_TEXT_LENGTH``, or ``None`` if empty.
    """
    # Remove script and style content
    html = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL | re.IGNORECASE)
    # Remove remaining HTML tags
    text = re.sub(r"<[^>]+>", " ", html)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()

    if not text:
        return None

    return text[:MAX_HTML_TEXT_LENGTH]
