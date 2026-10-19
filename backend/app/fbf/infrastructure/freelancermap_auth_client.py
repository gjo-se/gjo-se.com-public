"""Playwright-based login for freelancermap.de with session state persistence.

Workflow:
    1. Open browser (headless Chromium)
    2. Load ``/login``, fill in form and submit
    3. Wait for redirect – if the URL stays on ``/login``,
       the login failed (invalid credentials or CAPTCHA)
    4. Save Playwright session state (cookies + LocalStorage) as JSON file

The saved state can then be reused via ``PlaywrightClient(storage_state=path)``
for all AJAX requests.
"""

import asyncio
from pathlib import Path

import structlog
from playwright.async_api import async_playwright

from app.shared.config.config import settings

logger = structlog.get_logger(__name__)

_LOGIN_URL = "https://www.freelancermap.de/login"
_USERNAME_SELECTOR = "input[name='login']"
_PASSWORD_SELECTOR = "input[name='password']"
_LOGIN_TIMEOUT_MS = 20_000


class FreelancermapAuthError(Exception):
    """Raised when Playwright login to freelancermap.de fails.

    Possible causes:
    - Invalid credentials
    - CAPTCHA challenge
    - Unexpected page structure
    """


async def login_and_save_state(
    username: str,
    password: str,
    state_path: str,
) -> None:
    """Logs in to freelancermap.de and saves the session state.

    Performs a real browser login and writes the resulting Playwright storage state
    (cookies + LocalStorage) to *state_path*.
    The file can then be reused with ``PlaywrightClient(storage_state=state_path)``
    without needing to log in again.

    Args:
        username: Email address / login name for freelancermap.de (from FM_USERNAME).
        password: Password for freelancermap.de (from FM_PASSWORD).
        state_path: File path to write the Playwright state to.
            Parent directories are created if they do not exist.

    Raises:
        ValueError: If *username* or *password* are empty.
        FreelancermapAuthError: If the login page is still shown after submit
            (invalid credentials, CAPTCHA, etc.).
    """
    if not username or not password:
        raise ValueError("FM_USERNAME and FM_PASSWORD must not be empty to perform login.")

    Path(state_path).parent.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        logger.info("FreelancermapAuth: navigating to %s", _LOGIN_URL)
        _ = await page.goto(_LOGIN_URL, wait_until="networkidle")
        _ = await page.wait_for_selector(_USERNAME_SELECTOR, state="visible", timeout=_LOGIN_TIMEOUT_MS)

        await page.fill(_USERNAME_SELECTOR, username)
        await page.fill(_PASSWORD_SELECTOR, password)
        await page.press(_PASSWORD_SELECTOR, "Enter")

        await page.wait_for_load_state("networkidle", timeout=_LOGIN_TIMEOUT_MS)

        current_url = page.url
        if "/login" in current_url:
            await context.close()
            await browser.close()
            raise FreelancermapAuthError(
                f"Login failed – still on login page after submit. Check FM_USERNAME / FM_PASSWORD. URL: {current_url}"
            )

        _ = await context.storage_state(path=state_path)
        logger.info(
            "FreelancermapAuth: session state saved to %s (landed on %s)",
            state_path,
            current_url,
        )

        await context.close()
        await browser.close()


async def ensure_auth_state(
    username: str,
    password: str,
    force_login: bool = False,
) -> str | None:
    """Ensure a valid freelancermap.de login state is present for a scraping run.

    A Playwright login is performed only when credentials are given *and* the
    cached state file is missing or ``force_login`` is set. Without credentials –
    or when the login fails – the caller falls back to unauthenticated mode.

    Args:
        username: Login email / username (from the credential store).
        password: Password (from the credential store).
        force_login: If True, log in even when the state file already exists.

    Returns:
        Path to the state file (str) when credentials are present, otherwise
        ``None`` (unauthenticated mode).
    """
    if not username or not password:
        logger.info("FreelancermapAuth: no credentials -- unauthenticated mode")
        return None

    state_path = settings.FREELANCERMAP_AUTH_STATE_PATH

    if not force_login and await asyncio.to_thread(Path(state_path).exists):
        logger.info("FreelancermapAuth: reusing existing auth state from %s", state_path)
        return state_path

    logger.info("FreelancermapAuth: performing Playwright login for %s ...", username)
    try:
        await login_and_save_state(username, password, state_path)
    except FreelancermapAuthError:
        logger.exception("FreelancermapAuth: login failed -- unauthenticated fallback")
        return None

    return state_path
