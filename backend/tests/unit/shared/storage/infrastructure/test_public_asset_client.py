"""Unit tests for the public-asset key/CDN helpers."""

from __future__ import annotations

import pytest

from app.shared.config.config import settings
from app.shared.storage.infrastructure.public_asset_client import (
    is_public_asset_key,
    public_cdn_url_for,
)

pytestmark = pytest.mark.unit


@pytest.mark.parametrize("key", ["portfolio/hero.webp", "profile/me.png"])
def test_is_public_asset_key_true_for_public_prefixes(key: str) -> None:
    """Keys under the public website-image prefixes are public."""
    assert is_public_asset_key(key) is True


@pytest.mark.parametrize("key", ["technology-catalog/foo.svg", "other/x.png", "portfolio"])
def test_is_public_asset_key_false_for_other_prefixes(key: str) -> None:
    """Keys outside the public prefixes are not public."""
    assert is_public_asset_key(key) is False


def test_public_cdn_url_none_for_private_key(monkeypatch: pytest.MonkeyPatch) -> None:
    """Private keys never get a CDN URL, even when a CDN base is configured."""
    monkeypatch.setattr(settings, "OBJECT_STORE_S3_PUBLIC_CDN_URL", "https://cdn.example.com")

    assert public_cdn_url_for("technology-catalog/foo.svg") is None


def test_public_cdn_url_none_without_configured_cdn(monkeypatch: pytest.MonkeyPatch) -> None:
    """Public keys without a configured CDN base yield ``None`` (dev)."""
    monkeypatch.setattr(settings, "OBJECT_STORE_S3_PUBLIC_CDN_URL", "")

    assert public_cdn_url_for("portfolio/hero.webp") is None


def test_public_cdn_url_builds_absolute_url(monkeypatch: pytest.MonkeyPatch) -> None:
    """A configured CDN base produces the absolute public URL."""
    monkeypatch.setattr(settings, "OBJECT_STORE_S3_PUBLIC_CDN_URL", "https://cdn.example.com/")

    assert public_cdn_url_for("portfolio/hero.webp") == "https://cdn.example.com/portfolio/hero.webp"
