"""Git status API router.

Provides an endpoint that reports whether a specific architecture YAML file has
uncommitted changes in the working tree.
"""

from __future__ import annotations

import asyncio
import subprocess

import structlog
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.viscera.repositories.file.architecture_repository import ArchitectureStore

logger = structlog.get_logger(__name__)

router = APIRouter()


class GitStatusResponse(BaseModel):
    """Response for the git status endpoint."""

    has_changes: bool = Field(
        default=False,
        description="True when the file has uncommitted changes in the working tree.",
    )


@router.get("/status", response_model=GitStatusResponse)
async def get_git_status(
    file: str = Query(..., description="Relative file path under architecture/ (e.g. 'workspace.yml')"),
) -> GitStatusResponse:
    """Check whether a YAML file has uncommitted changes.

    Runs ``git diff --name-only`` in the project root and checks whether
    the given file appears in the output.
    """
    arch_root = ArchitectureStore().root()
    repo_root = arch_root.parent
    rel_path = f"architecture/{file}"

    try:
        result = await asyncio.to_thread(
            subprocess.run,
            ["git", "diff", "--name-only"],
            capture_output=True,
            text=True,
            timeout=10,
            cwd=str(repo_root),
            check=False,
        )
        if result.returncode != 0:
            logger.warning("git diff failed: %s", result.stderr)
            return GitStatusResponse(has_changes=False)

        changed_files = result.stdout.strip().split("\n")
        has_changes = rel_path in changed_files
        return GitStatusResponse(has_changes=has_changes)
    except (subprocess.TimeoutExpired, OSError) as exc:
        logger.warning("git diff OS error: %s", exc)
        return GitStatusResponse(has_changes=False)
