"""Git history API router.

Provides an endpoint that queries git log for a specific architecture YAML file
and returns commit history with object-level field changes parsed from YAML diffs.
"""

from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path
from typing import Any

import structlog
import yaml
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.viscera.repositories.file.architecture_repository import ArchitectureStore

logger = structlog.get_logger(__name__)

router = APIRouter()

# Felder der ``git log --format``-Zeile: hash, date, author, message.
_GIT_LOG_FIELD_COUNT = 4


class CommitInfo(BaseModel):
    """Information about a single git commit affecting the queried object."""

    hash: str = Field(..., description="Full commit hash")
    date: str = Field(..., description="ISO 8601 commit date")
    author: str = Field(..., description="Commit author name")
    message: str = Field(..., description="Commit message subject line")
    changed_fields: list[str] = Field(
        default_factory=list,
        description="Fields of the object that changed in this commit",
    )


class GitHistoryResponse(BaseModel):
    """Response for the git history endpoint."""

    commits: list[CommitInfo] = Field(default_factory=list)


def _get_yaml_at_commit(filepath: str, commit_hash: str) -> dict[str, Any] | list[Any] | None:
    """Retrieve the YAML content of a file at a specific commit."""
    try:
        result = subprocess.run(
            ["git", "show", f"{commit_hash}:{filepath}"],
            capture_output=True,
            text=True,
            check=False,
            timeout=10,
            cwd=ArchitectureStore().root().parent,
        )
        if result.returncode != 0:
            return None
        return yaml.safe_load(result.stdout)
    except (subprocess.TimeoutExpired, yaml.YAMLError, OSError) as exc:
        logger.warning("Failed to get YAML at commit %s for %s: %s", commit_hash, filepath, exc)
        return None


def _get_parent_commit(commit_hash: str, repo_root: Path) -> str | None:
    """Get the parent commit hash."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", f"{commit_hash}^"],
            capture_output=True,
            text=True,
            check=False,
            timeout=5,
            cwd=str(repo_root),
        )
        if result.returncode != 0:
            return None
        return result.stdout.strip()
    except (subprocess.TimeoutExpired, OSError):
        return None


def _find_object_in_data(data: Any, object_id: str) -> dict[str, Any] | None:
    """Find an object by ID in a loaded YAML data structure."""
    if data is None:
        return None

    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict) and item.get("id") == object_id:
                return dict(item)
        return None

    if isinstance(data, dict):
        if data.get("id") == object_id:
            return dict(data)
        containers: list[dict[str, Any]] = data.get("containers") or []
        for container in containers:
            if container.get("id") == object_id:
                return dict(container)

    return None


def _compute_changed_fields(
    prev_obj: dict[str, Any] | None,
    curr_obj: dict[str, Any] | None,
) -> list[str]:
    """Compute which fields changed between two versions of an object."""
    if prev_obj is None and curr_obj is None:
        return []
    if prev_obj is None:
        return list(curr_obj.keys()) if curr_obj else []
    if curr_obj is None:
        return list(prev_obj.keys())

    changed: list[str] = []
    all_keys = set(prev_obj.keys()) | set(curr_obj.keys())
    # Skip internal/id fields that aren't meaningful changes
    skip_fields = {"id", "type"}
    for key in sorted(all_keys):
        if key in skip_fields:
            continue
        prev_val = prev_obj.get(key)
        curr_val = curr_obj.get(key)
        if prev_val != curr_val:
            changed.append(key)
    return changed


@router.get("/history", response_model=GitHistoryResponse)
async def get_git_history(
    file: str = Query(..., description="Relative file path under architecture/ (e.g. 'workspace.yml')"),
    object_id: str = Query(..., alias="object", description="Object ID (e.g. 'backend' or 'backend.fastapi')"),
) -> GitHistoryResponse:
    """Return git commit history for a specific object in a YAML file.

    Executes ``git log`` on the given file, then for each commit retrieves
    the YAML at that commit and its parent to compute which fields of the
    object changed. Returns a list of commits with changed field information.
    """
    arch_root = ArchitectureStore().root()
    if not arch_root.is_dir():
        raise HTTPException(status_code=500, detail="Architecture directory not found")

    repo_root = arch_root.parent  # project root
    filepath = arch_root / file

    if not filepath.is_file():
        raise HTTPException(status_code=404, detail=f"File not found: {file}")

    rel_path = f"architecture/{file}"

    # Run git log
    try:
        result = await asyncio.to_thread(
            subprocess.run,
            [
                "git",
                "log",
                "--follow",
                "--format=%H||%aI||%an||%s",
                "--",
                rel_path,
            ],
            capture_output=True,
            text=True,
            check=False,
            timeout=15,
            cwd=str(repo_root),
        )
        if result.returncode != 0:
            logger.error("git log failed: %s", result.stderr)
            raise HTTPException(status_code=500, detail="git log command failed")
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="git log timed out") from None
    except OSError as exc:
        logger.exception("git log OS error")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    commits: list[CommitInfo] = []

    for line in result.stdout.strip().split("\n"):
        if not line:
            continue
        parts = line.split("||", _GIT_LOG_FIELD_COUNT - 1)
        if len(parts) != _GIT_LOG_FIELD_COUNT:
            continue

        commit_hash, date_str, author, message = parts

        # Get object at this commit and its parent
        curr_data = _get_yaml_at_commit(rel_path, commit_hash)
        curr_obj = _find_object_in_data(curr_data, object_id) if curr_data else None

        parent_hash = _get_parent_commit(commit_hash, repo_root)
        prev_obj: dict[str, Any] | None = None
        if parent_hash:
            prev_data = _get_yaml_at_commit(rel_path, parent_hash)
            prev_obj = _find_object_in_data(prev_data, object_id) if prev_data else None

        changed_fields = _compute_changed_fields(prev_obj, curr_obj)

        commits.append(
            CommitInfo(
                hash=commit_hash,
                date=date_str,
                author=author,
                message=message,
                changed_fields=changed_fields,
            )
        )

    return GitHistoryResponse(commits=commits)
