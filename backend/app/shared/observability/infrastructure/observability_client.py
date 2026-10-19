"""LangSmith observability setup.

LangChain/LangSmith read their configuration from process environment
variables (``LANGSMITH_*``). Because the project loads settings via
pydantic-settings (which does not export back into ``os.environ``), this module
bridges the two: it copies the resolved LangSmith settings into the environment
so the LangChain tracer picks them up transparently for every LLM call.
"""

import os

import structlog

from app.shared.config.config import settings

logger = structlog.get_logger(__name__)


def setup_langsmith() -> None:
    """Enable LangSmith tracing by exporting settings into the environment.

    No-op when ``LANGSMITH_TRACING`` is disabled. When enabled without an API
    key, tracing stays off and a warning is logged instead of failing startup.
    """
    if not settings.LANGSMITH_TRACING:
        return

    if not settings.LANGSMITH_API_KEY:
        logger.warning(
            "LANGSMITH_TRACING is enabled but LANGSMITH_API_KEY is empty – tracing disabled.",
        )
        return

    os.environ["LANGSMITH_TRACING"] = "true"
    os.environ["LANGSMITH_API_KEY"] = settings.LANGSMITH_API_KEY
    os.environ["LANGSMITH_PROJECT"] = settings.LANGSMITH_PROJECT
    os.environ["LANGSMITH_ENDPOINT"] = settings.LANGSMITH_ENDPOINT

    logger.info(
        "LangSmith tracing enabled – project '%s' via %s",
        settings.LANGSMITH_PROJECT,
        settings.LANGSMITH_ENDPOINT,
    )


def get_langsmith_dashboard_url() -> str:
    """Return a deep link to the LangSmith project dashboard.

    Resolves the tenant + project UUID via the LangSmith API for an exact link.
    Falls back to the projects overview URL when the project cannot be resolved
    (e.g. it has no traces yet). Returns an empty string when tracing is off.
    """
    if not settings.LANGSMITH_TRACING or not settings.LANGSMITH_API_KEY:
        return ""

    fallback = f"{settings.LANGSMITH_WEB_URL}/projects"
    try:
        from langsmith import Client

        client = Client(
            api_url=settings.LANGSMITH_ENDPOINT,
            api_key=settings.LANGSMITH_API_KEY,
        )
        project = client.read_project(project_name=settings.LANGSMITH_PROJECT)
        return project.url or fallback
    except Exception:
        logger.exception(
            "Could not resolve LangSmith project URL for '%s'; using fallback.",
            settings.LANGSMITH_PROJECT,
        )
        return fallback
